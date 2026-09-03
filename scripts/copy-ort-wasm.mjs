// Copies the onnxruntime-web runtime files the kiosk needs into public/ort (same-origin, no CDN).
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const src = join(root, 'node_modules', 'onnxruntime-web', 'dist');
const dst = join(root, 'public', 'ort');
if (!existsSync(src)) {
  console.log('[copy-ort-wasm] onnxruntime-web not installed yet, skipping');
  process.exit(0);
}
mkdirSync(dst, { recursive: true });
const files = [
  'ort-wasm-simd-threaded.jsep.wasm', // WebGPU execution provider
  'ort-wasm-simd-threaded.jsep.mjs',
  'ort-wasm-simd-threaded.wasm', // plain WASM fallback
  'ort-wasm-simd-threaded.mjs',
];
let n = 0;
for (const f of files) {
  if (existsSync(join(src, f))) {
    copyFileSync(join(src, f), join(dst, f));
    n++;
  }
}
console.log(`[copy-ort-wasm] copied ${n}/${files.length} files to public/ort`);
