import * as ort from 'onnxruntime-web/webgpu';
import type { Manifest } from './manifest';

export type Backend = 'webgpu' | 'wasm';

// The onnxruntime-web "bundle" build inlines its wasm loader and resolves the .wasm file via import.meta.url,
// which Vite serves in dev and copies into dist/assets at build time — no wasmPaths override needed.

export async function fetchWithProgress(url: string, onProgress: (loaded: number, total: number) => void): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`Model download failed (${res.status})`);
  const total = Number(res.headers.get('content-length') ?? 0);
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.length;
    onProgress(loaded, total);
  }
  const out = new Uint8Array(loaded);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.length;
  }
  return out;
}

export async function createSession(
  bytes: Uint8Array,
  preferred: Backend,
): Promise<{ session: ort.InferenceSession; backend: Backend }> {
  let hasGpu = false;
  if (preferred === 'webgpu' && 'gpu' in navigator) {
    try {
      const adapter = await (navigator as Navigator & { gpu: { requestAdapter: () => Promise<unknown> } }).gpu.requestAdapter();
      hasGpu = !!adapter;
    } catch {
      hasGpu = false;
    }
  }
  if (hasGpu) {
    try {
      ort.env.wasm.proxy = false;
      const session = await ort.InferenceSession.create(bytes, { executionProviders: ['webgpu'], graphOptimizationLevel: 'all' });
      return { session, backend: 'webgpu' };
    } catch (e) {
      console.warn('[detector] WebGPU init failed, falling back to WASM', e);
    }
  }
  ort.env.wasm.numThreads = self.crossOriginIsolated ? 4 : 1;
  const session = await ort.InferenceSession.create(bytes, { executionProviders: ['wasm'], graphOptimizationLevel: 'all' });
  return { session, backend: 'wasm' };
}

export async function warmUp(session: ort.InferenceSession, m: Manifest) {
  const t = new ort.Tensor('float32', new Float32Array(3 * m.imgsz * m.imgsz), [1, 3, m.imgsz, m.imgsz]);
  await session.run({ [m.inputName]: t });
}

export function makeTensor(data: Float32Array, imgsz: number) {
  return new ort.Tensor('float32', data, [1, 3, imgsz, imgsz]);
}

export type { InferenceSession } from 'onnxruntime-web';
