import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { Leaf, Wifi, WifiOff, Camera, CameraOff, Maximize2, RefreshCw, SwitchCamera, Keyboard, Timer, Radio } from 'lucide-react';
import { api, type Machine, type RecordDepositResult, type Session } from '../lib/api';
import { APP_URL } from '../lib/supabase';
import { useMachineFeed } from '../lib/realtime';
import { MATERIAL_LABEL, type Material } from '../lib/points';
import { firstName, formatInt } from '../lib/format';
import { KIOSK } from './kiosk.config';
import { EventQueue, type QueuedEvent } from './sync/eventQueue';
import { useCamera } from './camera/useCamera';
import { useDetector, type DetectorStatus } from './detector/useDetector';
import { bonk, chime, ding, unlockAudio } from './audio/sounds';

interface KToast { id: number; big: string; sub: string; bad: boolean }

export function KioskPage() {
  const { machineId: rawId } = useParams();
  const machineId = (rawId ?? 'SG-SUN-01').toUpperCase();
  const [params] = useSearchParams();
  const sim = params.get('sim') === '1';
  const debugParam = params.get('debug') === '1';

  const key = useMemo(() => {
    const k = params.get('key');
    const storeKey = `refillgo:kiosk:key:${machineId}`;
    if (k) {
      sessionStorage.setItem(storeKey, k);
      const u = new URL(window.location.href);
      u.searchParams.delete('key');
      window.history.replaceState(null, '', u.toString());
      return k;
    }
    return sessionStorage.getItem(storeKey) ?? '';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [started, setStarted] = useState(false);
  const [debug, setDebug] = useState(debugParam);
  const [overlay, setOverlay] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const [machine, setMachine] = useState<Machine | null>(null);
  const [summary, setSummary] = useState<Session | null>(null);
  const [toasts, setToasts] = useState<KToast[]>([]);
  const [hint, setHint] = useState<string | null>(null);
  const [queueSize, setQueueSize] = useState(0);
  const [keyError, setKeyError] = useState(false);
  const [now, setNow] = useState(Date.now());
  const shownDeposits = useRef(new Set<number>());
  const toastId = useRef(0);
  const prevActive = useRef<Session | null>(null);

  const { active, setActive, lastDeposit, live, refresh } = useMachineFeed(started ? machineId : undefined);
  const cam = useCamera(started && !sim);

  // ---- toasts / sounds
  const pushToast = useCallback((big: string, sub: string, bad: boolean) => {
    const id = ++toastId.current;
    setToasts((t) => [...t.slice(-2), { id, big, sub, bad }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 1600);
    if (bad) bonk();
    else ding();
  }, []);

  const announce = useCallback(
    (material: Material, points: number, depositId?: number) => {
      if (depositId !== undefined) {
        if (shownDeposits.current.has(depositId)) return;
        shownDeposits.current.add(depositId);
      }
      if (material === 'rejected') pushToast('Not accepted', "Sorry, we can't take that one — PET bottles and aluminium cans only", true);
      else pushToast(`+${points}`, MATERIAL_LABEL[material], false);
    },
    [pushToast],
  );

  // ---- deposit queue (idempotent RPC)
  const queue = useMemo(() => {
    if (!started) return null;
    return new EventQueue(machineId, key, (ev: QueuedEvent, res: RecordDepositResult) => {
      handleResult(ev.material, res);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, machineId, key]);

  useEffect(() => {
    if (!queue) return;
    setQueueSize(queue.size);
    return queue.subscribe(setQueueSize);
  }, [queue]);

  const handleResult = useCallback(
    (material: Material, res: RecordDepositResult) => {
      if (res.status === 'unauthorized') {
        setKeyError(true);
        return;
      }
      if (res.session) setActive(res.session.status === 'active' ? res.session : null);
      if (res.status === 'ok' || res.status === 'rejected') announce(material, res.points_added ?? 0, res.deposit_id);
      else if (res.status === 'no_session') pushToast('Scan first', 'Scan the QR code with the RefillGo app to start earning', true);
      if (material !== 'rejected' && (res.status === 'ok' || res.status === 'no_session')) void loadMachine();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [announce, pushToast, setActive],
  );

  const submit = useCallback(
    (material: Material) => {
      if (!queue) return;
      void queue.submit(material).then((res) => {
        if (res === null) pushToast(material === 'rejected' ? 'Not accepted' : `+${material === 'can' ? KIOSK.points.can : KIOSK.points.pet}`, 'Offline — will sync when back online', material === 'rejected');
      });
    },
    [queue, pushToast],
  );

  // ---- detector (camera → YOLO → state machine)
  const det = useDetector({
    videoRef: cam.videoRef,
    enabled: started && !sim && cam.ready,
    hasSession: !!active,
    onCredit: (m) => submit(m),
    onReject: () => submit('rejected'),
    onHint: setHint,
  });

  // ---- machine + clock
  const loadMachine = useCallback(async () => {
    try {
      setMachine(await api.getMachine(machineId));
    } catch {
      /* ignore */
    }
  }, [machineId]);
  useEffect(() => {
    if (!started) return;
    void loadMachine();
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.clearInterval(t);
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, [started, loadMachine]);

  // ---- realtime deposits from other sources (phone flow, curl, second kiosk)
  useEffect(() => {
    if (lastDeposit && lastDeposit.machine_id === machineId) announce(lastDeposit.material, lastDeposit.points, lastDeposit.id);
  }, [lastDeposit, machineId, announce]);

  // ---- session start/end transitions
  useEffect(() => {
    const prev = prevActive.current;
    if (!prev && active) {
      chime();
      setSummary(null);
    }
    if (prev && !active) {
      api.getSession(prev.id).then((s) => setSummary(s ?? prev)).catch(() => setSummary(prev));
      window.setTimeout(() => setSummary(null), KIOSK.summaryMs);
    }
    prevActive.current = active;
  }, [active]);

  // ---- idle timeout: end a forgotten session
  useEffect(() => {
    if (!active) return;
    const idle = now - new Date(active.last_activity_at).getTime();
    if (idle > KIOSK.idleTimeoutMs) void api.endSession(active.id).then(() => refresh());
  }, [now, active, refresh]);

  // ---- operator keys
  const startDemoSession = useCallback(async () => {
    const res = await api.startSession(KIOSK.demoUserId, machineId);
    if (res.status === 'ok' && res.session) setActive(res.session);
    else pushToast('Busy', res.message ?? 'Could not open a demo session', true);
  }, [machineId, setActive, pushToast]);
  const endActive = useCallback(async () => {
    if (active) await api.endSession(active.id);
    await refresh();
  }, [active, refresh]);

  useEffect(() => {
    if (!started) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      switch (e.key.toLowerCase()) {
        case 'p': submit('pet'); break;
        case 'c': submit('can'); break;
        case 'x': submit('rejected'); break;
        case 's': void startDemoSession(); break;
        case 'e': void endActive(); break;
        case 'o': setOverlay((v) => !v); break;
        case 'd': setDebug((v) => !v); break;
        case 'r': void cam.restart(); break;
        case 'k': cam.cycle(); break;
        case 'b': det.recaptureBackground(); break;
        case 'f': toggleFullscreen(); break;
        case 'q': void queue?.flush(); break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [started, submit, startDemoSession, endActive, cam, det, queue]);

  const begin = async () => {
    unlockAudio();
    await toggleFullscreen(true);
    try {
      await (navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<unknown> } }).wakeLock?.request('screen');
    } catch {
      /* ignore */
    }
    setStarted(true);
  };

  if (!key && !sim) {
    return (
      <Shell>
        <div className="flex h-full flex-col items-center justify-center text-center">
          <Leaf size={56} className="text-brand" />
          <h1 className="mt-4 text-4xl font-extrabold">Kiosk key missing</h1>
          <p className="mt-2 max-w-xl text-xl text-ink-2">Open this page as <code className="rounded bg-white px-2">/kiosk/{machineId}?key=…</code> (the machine key from the seed), or add <code className="rounded bg-white px-2">?sim=1</code> to rehearse without a machine.</p>
        </div>
      </Shell>
    );
  }

  if (!started) {
    return (
      <Shell>
        <button type="button" onClick={begin} className="press flex h-full w-full flex-col items-center justify-center text-center">
          <span className="flex h-28 w-28 items-center justify-center rounded-[36px] brand-gradient text-white shadow-brand"><Leaf size={64} /></span>
          <span className="mt-8 text-5xl font-extrabold">RefillGo Station</span>
          <span className="mt-2 text-2xl text-ink-2">{machineId} · Lobby A · Sunrise Tower</span>
          <span className="mt-10 rounded-full bg-ink px-8 py-4 text-2xl font-bold text-white">Tap to start kiosk</span>
          <span className="mt-4 text-lg text-ink-3">Enables camera, sound and full screen</span>
        </button>
      </Shell>
    );
  }

  const qrValue = `${APP_URL}/m/${machineId}`;
  const fill = machine?.fill_level ?? 0;

  return (
    <Shell>
      {/* header */}
      <header className="flex items-center gap-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl brand-gradient text-white"><Leaf size={26} /></span>
        <div>
          <div className="text-2xl font-extrabold leading-tight">RefillGo Station</div>
          <div className="text-base text-ink-3">{machineId} · {machine?.name ?? 'Lobby A'} · {machine?.building ?? 'Sunrise Tower'}</div>
        </div>
        <div className="ml-auto flex items-center gap-2 text-sm font-semibold">
          <Pill ok={online} icon={online ? <Wifi size={14} /> : <WifiOff size={14} />}>{online ? 'Online' : 'Offline'}</Pill>
          <Pill ok={live} icon={<Radio size={14} />}>{live ? 'Live' : 'Polling'}</Pill>
          {queueSize > 0 && <Pill ok={false}>Syncing {queueSize}</Pill>}
          {!sim && <Pill ok={cam.ready} icon={cam.ready ? <Camera size={14} /> : <CameraOff size={14} />}>{cam.ready ? shortLabel(cam.label) : 'No camera'}</Pill>}
          <Pill ok={det.status === 'ready'}>{detLabel(det.status, det.backend, det.fps)}</Pill>
          <span className="tnum ml-2 text-lg font-bold text-ink-2">{new Date(now).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </header>

      {keyError && <div className="mt-4 rounded-2xl bg-coral px-5 py-3 text-lg font-bold text-white">Machine key rejected by the server — check the ?key= value.</div>}

      {/* body */}
      <div className="mt-5 grid flex-1 min-h-0 grid-cols-12 gap-5">
        {/* left: QR (idle) or resident panel (session) */}
        <div className="col-span-5 flex min-h-0 flex-col gap-5">
          <AnimatePresence mode="wait">
            {!active ? (
              <motion.div key="qr" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="card flex flex-1 flex-col items-center justify-center p-8 text-center">
                <div className="rounded-3xl bg-white p-4 shadow-card">
                  <QRCodeSVG value={qrValue} size={300} level="H" fgColor="#10241A" bgColor="#FFFFFF" />
                </div>
                <div className="mt-6 text-4xl font-extrabold">Scan to start</div>
                <div className="mt-2 text-xl text-ink-2">Open the RefillGo app → tap the QR button</div>
                <div className="mt-5 flex items-center gap-2 rounded-full bg-page px-5 py-2 text-lg text-ink-2"><Keyboard size={18} /> or enter station code <b className="tracking-wider text-ink">{machineId}</b></div>
              </motion.div>
            ) : (
              <motion.div key="session" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="brand-gradient relative flex flex-1 flex-col overflow-hidden rounded-3xl p-8 text-white shadow-brand">
                <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/10" />
                <div className="flex items-center justify-between">
                  <div className="text-4xl font-extrabold">Hi, {firstName(active.display_name ?? 'there')} 👋</div>
                  <div className="flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-lg font-semibold tnum"><Timer size={18} /> {elapsed(active.started_at, now)}</div>
                </div>
                <div className="mt-2 text-xl text-white/85">Drop PET bottles or aluminium cans into the slot</div>
                <div className="mt-8 grid grid-cols-2 gap-4">
                  <Counter label="PET bottles" value={active.pet_count} />
                  <Counter label="Aluminium cans" value={active.can_count} />
                </div>
                <div className="mt-4 rounded-3xl bg-white/15 p-6">
                  <div className="text-lg text-white/85">Green Points this session</div>
                  <div className="tnum text-[96px] font-extrabold leading-none">+{formatInt(active.points)}</div>
                </div>
                <div className="mt-auto text-lg text-white/80">Finish on your phone when you're done.</div>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="card flex items-center gap-5 px-6 py-4">
            <div className="flex-1">
              <div className="flex items-center justify-between text-base font-semibold text-ink-2"><span>Bin fill level</span><span className="tnum">{fill}%</span></div>
              <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-line"><div className={`h-full rounded-full transition-[width] duration-700 ${fill >= 80 ? 'bg-coral' : fill >= 60 ? 'bg-amber' : 'bg-brand'}`} style={{ width: `${fill}%` }} /></div>
            </div>
            <div className="text-right text-sm text-ink-3">Collection partner notified at 80%<br />GreenLoop Recycling (demo)</div>
          </div>
        </div>

        {/* right: camera */}
        <div className="col-span-7 relative min-h-0 overflow-hidden rounded-3xl bg-ink shadow-float">
          {!sim ? (
            <>
              <video ref={cam.videoRef} muted playsInline autoPlay className="h-full w-full object-cover" />
              <canvas ref={det.canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />
              {cam.error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-amber/95 p-8 text-center text-ink">
                  <CameraOff size={64} />
                  <div className="mt-4 text-3xl font-extrabold">Camera lost — press R</div>
                  <div className="mt-2 text-lg">{cam.error}</div>
                </div>
              )}
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center text-white/80">
              <div className="text-7xl">🥤</div>
              <div className="mt-4 text-3xl font-bold">Simulation mode</div>
              <div className="mt-2 text-lg">Press P (PET) · C (can) · X (reject) · S (demo session)</div>
            </div>
          )}
          {/* hint / toasts */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 p-6">
            <AnimatePresence>
              {toasts.map((t) => (
                <motion.div key={t.id} initial={{ opacity: 0, y: 30, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20 }} transition={{ type: 'spring', stiffness: 300, damping: 22 }} className={`flex items-center gap-5 rounded-3xl px-8 py-4 shadow-float ${t.bad ? 'bg-coral text-white' : 'bg-white text-ink'}`}>
                  <span className={`tnum text-[64px] font-extrabold leading-none ${t.bad ? 'text-white' : 'text-brand'}`}>{t.big}</span>
                  <span className="max-w-md text-2xl font-semibold leading-snug">{t.sub}</span>
                </motion.div>
              ))}
            </AnimatePresence>
            <div className="rounded-full bg-black/55 px-5 py-2 text-lg font-semibold text-white backdrop-blur">
              {hint ?? (active ? 'Insert a PET bottle or aluminium can' : 'Scan the QR code with the app to start')}
            </div>
          </div>
          {debug && (
            <pre className="absolute left-3 top-3 max-w-md rounded-xl bg-black/70 p-3 text-xs text-lime">{JSON.stringify({ phase: det.phase, presence: det.presence.toFixed(3), fps: det.fps, ms: det.inferenceMs, backend: det.backend, boxes: det.boxes.map((b) => `${b.cls}:${b.conf.toFixed(2)}`), queue: queueSize, live, session: active?.id?.slice(0, 8) ?? null }, null, 1)}</pre>
          )}
        </div>
      </div>

      {/* summary overlay */}
      <AnimatePresence>
        {summary && !active && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-40 flex items-center justify-center bg-page/95 backdrop-blur">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="card max-w-3xl p-12 text-center">
              <div className="text-3xl font-bold text-ink-2">Thanks, {firstName(summary.display_name ?? 'neighbour')}!</div>
              <div className="tnum mt-3 text-[120px] font-extrabold leading-none text-brand">+{formatInt(summary.points)}</div>
              <div className="mt-2 text-3xl font-semibold">Green Points added to your account</div>
              <div className="mt-4 text-2xl text-ink-3">{summary.pet_count} PET · {summary.can_count} cans{summary.rejected_count ? ` · ${summary.rejected_count} not accepted` : ''}</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* operator overlay */}
      <AnimatePresence>
        {overlay && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="absolute bottom-6 left-6 z-50 w-[420px] rounded-3xl bg-ink/92 p-5 text-white shadow-float backdrop-blur">
            <div className="mb-3 flex items-center justify-between text-sm font-bold uppercase tracking-wider text-lime">Operator <span className="text-white/50">press O to hide</span></div>
            <div className="grid grid-cols-3 gap-2">
              <OpBtn onClick={() => submit('pet')}>PET <kbd>P</kbd></OpBtn>
              <OpBtn onClick={() => submit('can')}>Can <kbd>C</kbd></OpBtn>
              <OpBtn onClick={() => submit('rejected')} tone="bad">Reject <kbd>X</kbd></OpBtn>
              <OpBtn onClick={() => void startDemoSession()}>Demo session <kbd>S</kbd></OpBtn>
              <OpBtn onClick={() => void endActive()}>End session <kbd>E</kbd></OpBtn>
              <OpBtn onClick={() => void queue?.flush()}>Flush queue <kbd>Q</kbd></OpBtn>
              <OpBtn onClick={() => void cam.restart()}><RefreshCw size={14} /> Camera <kbd>R</kbd></OpBtn>
              <OpBtn onClick={() => cam.cycle()}><SwitchCamera size={14} /> Next cam <kbd>K</kbd></OpBtn>
              <OpBtn onClick={() => toggleFullscreen()}><Maximize2 size={14} /> Full <kbd>F</kbd></OpBtn>
              <OpBtn onClick={() => det.recaptureBackground()}>Background <kbd>B</kbd></OpBtn>
              <OpBtn onClick={() => det.cycleBackend()}>Backend <kbd>M</kbd></OpBtn>
              <OpBtn onClick={() => setDebug((v) => !v)}>Debug <kbd>D</kbd></OpBtn>
            </div>
            <div className="mt-3 text-xs text-white/60">Camera: {cam.label || '—'} · detector: {det.status} ({det.backend}) · {det.modelName}</div>
          </motion.div>
        )}
      </AnimatePresence>
      <button type="button" onClick={() => setOverlay((v) => !v)} aria-label="Operator" className="absolute bottom-3 left-3 h-6 w-6 rounded-full opacity-0" />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="relative flex h-dvh w-full flex-col overflow-hidden bg-page p-6 text-ink">{children}</div>;
}
function Pill({ ok, icon, children }: { ok: boolean; icon?: React.ReactNode; children: React.ReactNode }) {
  return <span className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 ${ok ? 'bg-brand-soft text-brand-deep' : 'bg-amber/15 text-amber'}`}>{icon}{children}</span>;
}
function Counter({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl bg-white/15 p-5">
      <div className="text-lg text-white/85">{label}</div>
      <div className="tnum text-6xl font-extrabold leading-none">{value}</div>
    </div>
  );
}
function OpBtn({ children, onClick, tone }: { children: React.ReactNode; onClick: () => void; tone?: 'bad' }) {
  return (
    <button type="button" onClick={onClick} className={`press flex items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-sm font-semibold ${tone === 'bad' ? 'bg-coral/80' : 'bg-white/12'} [&_kbd]:rounded [&_kbd]:bg-white/20 [&_kbd]:px-1 [&_kbd]:text-[10px]`}>
      {children}
    </button>
  );
}
function elapsed(startIso: string, now: number) {
  const s = Math.max(0, Math.floor((now - new Date(startIso).getTime()) / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
function shortLabel(l: string) {
  return l.replace(/\(.*?\)/g, '').trim().slice(0, 18) || 'Camera';
}
function detLabel(status: DetectorStatus, backend: string, fps: number) {
  if (status === 'ready') return `${backend} · ${fps} fps`;
  if (status === 'loading') return 'Loading recogniser…';
  if (status === 'error') return 'Recogniser off';
  return 'Recogniser idle';
}
async function toggleFullscreen(force?: boolean) {
  try {
    if (!document.fullscreenElement || force) await document.documentElement.requestFullscreen();
    else await document.exitFullscreen();
  } catch {
    /* ignore */
  }
}
