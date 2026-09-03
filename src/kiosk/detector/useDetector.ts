import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { loadManifest, DEFAULT_ROI, type Manifest } from './manifest';
import { createSession, fetchWithProgress, makeTensor, warmUp, type Backend, type InferenceSession } from './ortSession';
import { roiPixels, toTensorData, type RoiPx } from './preprocess';
import { decodeEnd2End, decodeRaw, toKioskBoxes } from './postprocess';
import { PresenceDetector } from './presence';
import { initialState, reduce, setSessionActive, type Box, type MachineState, type Phase } from '../logic/depositMachine';

export type DetectorStatus = 'idle' | 'loading' | 'ready' | 'error';

interface Options {
  videoRef: RefObject<HTMLVideoElement | null>;
  enabled: boolean;
  hasSession: boolean;
  onCredit: (m: 'pet' | 'can') => void;
  onReject: (reason: 'other' | 'uncertain') => void;
  onHint: (text: string | null) => void;
}

const COLORS: Record<Box['cls'], string> = { pet: '#1BA265', can: '#2F7DD1', other: '#E5484D' };
const BACKEND_KEY = 'refillgo:kiosk:backend';

export function useDetector(opts: Options) {
  const { videoRef, enabled, hasSession } = opts;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [status, setStatus] = useState<DetectorStatus>('idle');
  const [backend, setBackendState] = useState<Backend>(() => (localStorage.getItem(BACKEND_KEY) as Backend) || 'webgpu');
  const [progress, setProgress] = useState(0);
  const [fps, setFps] = useState(0);
  const [inferenceMs, setInferenceMs] = useState(0);
  const [phase, setPhase] = useState<Phase>('NO_SESSION');
  const [presence, setPresence] = useState(0);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [modelName, setModelName] = useState('no model');

  const sessionRef = useRef<InferenceSession | null>(null);
  const manifestRef = useRef<Manifest | null>(null);
  const stateRef = useRef<MachineState>(initialState(false));
  const boxesRef = useRef<Box[]>([]);
  const busyRef = useRef(false);
  const presenceRef = useRef(new PresenceDetector());
  const scratchRef = useRef<HTMLCanvasElement>(document.createElement('canvas'));
  const cbRef = useRef(opts);
  cbRef.current = opts;
  const frameTimes = useRef<number[]>([]);

  // session active → re-arm the reducer
  useEffect(() => {
    stateRef.current = setSessionActive(stateRef.current, hasSession, performance.now());
    setPhase(stateRef.current.phase);
    if (!hasSession) cbRef.current.onHint(null);
  }, [hasSession]);

  // load model
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    (async () => {
      setStatus('loading');
      const m = await loadManifest();
      if (cancelled) return;
      if (!m) {
        setStatus('idle');
        setModelName('no model (operator keys only)');
        return;
      }
      manifestRef.current = m;
      setModelName(m.name || m.file);
      try {
        const bytes = await fetchWithProgress(m.file, (l, t) => setProgress(t ? l / t : 0));
        const { session, backend: b } = await createSession(bytes, backend);
        if (cancelled) return;
        await warmUp(session, m);
        sessionRef.current = session;
        setBackendState(b);
        setStatus('ready');
      } catch (e) {
        console.error('[detector] load failed', e);
        setStatus('error');
      }
    })();
    return () => {
      cancelled = true;
      sessionRef.current = null;
    };
  }, [enabled, backend]);

  // main loop: presence every frame, inference when free, reducer on each observation, overlay draw
  useEffect(() => {
    if (!enabled) return;
    let raf = 0;
    let alive = true;
    const loop = () => {
      if (!alive) return;
      raf = requestAnimationFrame(loop);
      const video = videoRef.current;
      const m = manifestRef.current;
      if (!video || video.readyState < 2 || !m) return;
      const now = performance.now();
      const roi = roiPixels(video, m.roi ?? DEFAULT_ROI);
      const st = stateRef.current;
      const allowAdapt = st.phase === 'READY' || st.phase === 'NO_SESSION';
      const p = presenceRef.current.measure(video, roi, now, allowAdapt);
      setPresence(p);

      if (sessionRef.current && !busyRef.current) {
        busyRef.current = true;
        const t0 = performance.now();
        const input = toTensorData(video, roi, m.imgsz, scratchRef.current);
        const session = sessionRef.current;
        session
          .run({ [m.inputName]: makeTensor(input, m.imgsz) })
          .then((out) => {
            const o = out[m.outputName] ?? out[Object.keys(out)[0]];
            const data = o.data as Float32Array;
            const raw = m.layout === 'end2end' ? decodeEnd2End(data, o.dims, m.imgsz) : decodeRaw(data, o.dims, m.imgsz);
            boxesRef.current = toKioskBoxes(raw, m.classes);
            setBoxes(boxesRef.current);
            const dt = performance.now() - t0;
            setInferenceMs(Math.round(dt));
            const ft = frameTimes.current;
            ft.push(performance.now());
            while (ft.length && ft[0] < performance.now() - 1000) ft.shift();
            setFps(ft.length);
          })
          .catch((e) => console.error('[detector] run failed', e))
          .finally(() => {
            busyRef.current = false;
          });
      }

      const { state, effects } = reduce(st, { t: now, boxes: boxesRef.current, presence: p }, now);
      stateRef.current = state;
      if (state.phase !== st.phase) setPhase(state.phase);
      for (const ef of effects) {
        if (ef.type === 'credit') cbRef.current.onCredit(ef.material);
        else if (ef.type === 'reject') cbRef.current.onReject(ef.reason);
        else if (ef.type === 'hint') cbRef.current.onHint(ef.text);
      }
      draw(canvasRef.current, video, roi, boxesRef.current, state.phase);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
    };
  }, [enabled, videoRef]);

  const recaptureBackground = useCallback(() => presenceRef.current.reset(), []);
  const cycleBackend = useCallback(() => {
    const next: Backend = backend === 'webgpu' ? 'wasm' : 'webgpu';
    localStorage.setItem(BACKEND_KEY, next);
    setBackendState(next);
  }, [backend]);

  return { canvasRef, status, backend, progress, fps, inferenceMs, phase, presence, boxes, modelName, recaptureBackground, cycleBackend };
}

/** Draw ROI + boxes on the overlay canvas, mapping video pixels → element pixels under object-fit: cover. */
function draw(canvas: HTMLCanvasElement | null, video: HTMLVideoElement, roi: RoiPx, boxes: Box[], phase: Phase) {
  if (!canvas) return;
  const cw = canvas.clientWidth;
  const ch = canvas.clientHeight;
  const dpr = window.devicePixelRatio || 1;
  if (canvas.width !== cw * dpr || canvas.height !== ch * dpr) {
    canvas.width = cw * dpr;
    canvas.height = ch * dpr;
  }
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cw, ch);
  const vw = video.videoWidth || 1280;
  const vh = video.videoHeight || 720;
  const scale = Math.max(cw / vw, ch / vh);
  const ox = (cw - vw * scale) / 2;
  const oy = (ch - vh * scale) / 2;
  const map = (x: number, y: number) => [ox + x * scale, oy + y * scale] as const;

  // ROI
  const [rx, ry] = map(roi.x, roi.y);
  const rs = roi.size * scale;
  ctx.lineWidth = 3;
  ctx.setLineDash([14, 10]);
  ctx.strokeStyle = phase === 'CREDITED' ? '#3DFFA2' : phase === 'REJECTED' ? '#E5484D' : 'rgba(255,255,255,0.75)';
  roundRect(ctx, rx, ry, rs, rs, 24);
  ctx.stroke();
  ctx.setLineDash([]);

  // boxes (normalised to ROI)
  for (const b of boxes) {
    const [x1, y1] = map(roi.x + b.x1 * roi.size, roi.y + b.y1 * roi.size);
    const [x2, y2] = map(roi.x + b.x2 * roi.size, roi.y + b.y2 * roi.size);
    ctx.strokeStyle = COLORS[b.cls];
    ctx.lineWidth = 4;
    roundRect(ctx, x1, y1, x2 - x1, y2 - y1, 12);
    ctx.stroke();
    const label = `${b.cls === 'pet' ? 'PET bottle' : b.cls === 'can' ? 'Aluminium can' : 'Not accepted'} ${(b.conf * 100).toFixed(0)}%`;
    ctx.font = '600 16px "Be Vietnam Pro", system-ui, sans-serif';
    const tw = ctx.measureText(label).width + 16;
    ctx.fillStyle = COLORS[b.cls];
    roundRect(ctx, x1, Math.max(0, y1 - 28), tw, 26, 8);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillText(label, x1 + 8, Math.max(18, y1 - 9));
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
