import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Scanner, type IDetectedBarcode } from '@yudiel/react-qr-scanner';
import { prepareZXingModule } from 'barcode-detector/ponyfill';
import zxingWasmUrl from 'zxing-wasm/reader/zxing_reader.wasm?url';
import { Keyboard, MapPin } from 'lucide-react';

// Self-host the QR decoder wasm (no CDN dependency on classroom 4G).
prepareZXingModule({
  overrides: { locateFile: (path: string, prefix: string) => (path.endsWith('.wasm') ? zxingWasmUrl : prefix + path) },
  fireImmediately: true,
});
import { api } from '../lib/api';
import { useStore } from '../lib/store';
import { Button, Page, TopBar } from '../components/ui';
import { useToast } from '../components/Toast';

export function parseMachineCode(raw: string): string | null {
  const s = raw.trim();
  const m = s.match(/\/(?:m|d)\/([A-Za-z0-9-]+)/);
  if (m) return m[1].toUpperCase();
  if (/^[A-Za-z]{2}-[A-Za-z]{3}-\d{2}$/.test(s)) return s.toUpperCase();
  return null;
}

export function Scan() {
  const nav = useNavigate();
  const toast = useToast();
  const { user, setSession, setBalance } = useStore();
  const [manual, setManual] = useState('');
  const [busy, setBusy] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);
  const lockRef = useRef(false);

  const start = useCallback(
    async (machineId: string) => {
      if (!user || lockRef.current) return;
      lockRef.current = true;
      setBusy(true);
      try {
        const res = await api.startSession(user.id, machineId);
        if (res.status === 'ok' && res.session) {
          setSession(res.session);
          if (typeof res.balance === 'number') setBalance(res.balance);
          nav(`/session/${res.session.id}`, { replace: true });
          return;
        }
        toast(res.message || (res.status === 'no_machine' ? `Station ${machineId} not found.` : 'Could not start a session.'), 'err');
      } catch (e) {
        toast((e as Error).message, 'err');
      } finally {
        setBusy(false);
        window.setTimeout(() => (lockRef.current = false), 1500);
      }
    },
    [user, nav, setSession, setBalance, toast],
  );

  const onScan = (codes: IDetectedBarcode[]) => {
    for (const c of codes) {
      const id = parseMachineCode(c.rawValue);
      if (id) {
        void start(id);
        return;
      }
    }
  };

  return (
    <Page className="min-h-dvh bg-ink text-white">
      <div className="bg-ink/80">
        <TopBar title="Scan station QR" onBack={() => nav(-1)} />
      </div>
      <div className="relative mx-4 overflow-hidden rounded-3xl bg-black" style={{ aspectRatio: '3 / 4' }}>
        {!camError ? (
          <Scanner
            onScan={onScan}
            onError={(e) => setCamError((e as unknown as { message?: string })?.message || 'Camera unavailable')}
            constraints={{ facingMode: 'environment' }}
            formats={['qr_code']}
            components={{ finder: false, torch: false, zoom: false }}
            styles={{ container: { width: '100%', height: '100%' }, video: { objectFit: 'cover' } }}
            scanDelay={300}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center p-6 text-center text-[14px] text-white/80">
            <div className="text-3xl">📷</div>
            <div className="mt-2 font-semibold">Camera not available</div>
            <div className="mt-1 text-[12.5px] text-white/60">{camError}. Enter the station code below instead.</div>
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-56 w-56 rounded-3xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,.35)]" />
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-4 text-center text-[13px] font-medium text-white/90">
          Point at the QR code on the RefillGo station
        </div>
      </div>

      <div className="mx-4 mt-4 rounded-3xl bg-white p-4 text-ink">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-ink-3">
          <Keyboard size={16} /> Or enter the station code
        </div>
        <div className="mt-2 flex gap-2">
          <input
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder="SG-SUN-01"
            autoCapitalize="characters"
            className="h-12 flex-1 rounded-2xl border border-line bg-page px-3 text-[15px] font-semibold uppercase tracking-wider outline-none"
          />
          <Button
            className="w-auto px-5"
            disabled={busy || !parseMachineCode(manual)}
            onClick={() => {
              const id = parseMachineCode(manual);
              if (id) void start(id);
            }}
          >
            {busy ? '…' : 'Start'}
          </Button>
        </div>
        <button
          type="button"
          onClick={() => void start('SG-SUN-01')}
          disabled={busy}
          className="press mt-3 flex w-full items-center gap-3 rounded-2xl bg-page p-3 text-left"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand-deep"><MapPin size={18} /></span>
          <span className="flex-1">
            <span className="block text-[14px] font-bold">SG-SUN-01 · Lobby A</span>
            <span className="block text-[12px] text-ink-3">Sunrise Tower · nearest station</span>
          </span>
          <span className="text-[12.5px] font-semibold text-brand">Use</span>
        </button>
      </div>
    </Page>
  );
}
