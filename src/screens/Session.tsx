import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, X, Leaf, Wifi, WifiOff } from 'lucide-react';
import { api, type Deposit } from '../lib/api';
import { useStore } from '../lib/store';
import { useLiveSession } from '../lib/realtime';
import { MATERIAL_LABEL } from '../lib/points';
import { formatInt, formatSigned } from '../lib/format';
import { Button, Chip, Page, TopBar } from '../components/ui';
import { CountUp } from '../components/CountUp';
import { Sheet } from '../components/Sheet';
import { useToast } from '../components/Toast';

export function SessionScreen() {
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const { balance, setBalance, setSession } = useStore();
  const { session, deposits, live } = useLiveSession(id);
  const [ending, setEnding] = useState(false);
  const [summary, setSummary] = useState(false);
  const [floats, setFloats] = useState<{ id: number; text: string; bad: boolean }[]>([]);
  const seen = useRef<Set<number>>(new Set());
  const baseBalance = useRef<number | null>(null);

  // remember the balance at session start so the live balance = base + session points
  useEffect(() => {
    if (session && baseBalance.current === null) baseBalance.current = balance - session.points;
  }, [session, balance]);

  // float a chip for each new deposit + haptic
  useEffect(() => {
    const fresh = deposits.filter((d) => !seen.current.has(d.id));
    if (!fresh.length) return;
    if (seen.current.size === 0) {
      deposits.forEach((d) => seen.current.add(d.id));
      return; // initial load: no animation
    }
    fresh.forEach((d) => {
      seen.current.add(d.id);
      const bad = d.material === 'rejected';
      const fid = d.id;
      setFloats((f) => [...f, { id: fid, text: bad ? 'Not accepted' : `+${d.points}`, bad }]);
      window.setTimeout(() => setFloats((f) => f.filter((x) => x.id !== fid)), 1400);
      if (navigator.vibrate) navigator.vibrate(bad ? [30, 40, 30] : 40);
    });
  }, [deposits]);

  // keep the global balance in sync while the session is live
  useEffect(() => {
    if (session && baseBalance.current !== null) setBalance(baseBalance.current + session.points);
  }, [session, setBalance]);

  useEffect(() => {
    if (session?.status === 'ended') {
      setSession(null);
      setSummary(true);
    }
  }, [session?.status, setSession]);

  const feed = useMemo(() => [...deposits].reverse(), [deposits]);

  const end = async () => {
    if (!id) return;
    setEnding(true);
    try {
      const res = await api.endSession(id);
      if (res.status === 'ok' && typeof res.balance === 'number') setBalance(res.balance);
      setSession(null);
      setSummary(true);
    } catch (e) {
      toast((e as Error).message, 'err');
    } finally {
      setEnding(false);
    }
  };

  return (
    <Page className="min-h-dvh">
      <TopBar
        title="Deposit session"
        onBack={() => nav('/')}
        right={
          <Chip tone={live ? 'soft' : 'white'} className={live ? '' : 'bg-line text-ink-3'}>
            {live ? <Wifi size={12} /> : <WifiOff size={12} />} {live ? 'Live' : 'Syncing'}
          </Chip>
        }
      />
      <div className="px-4">
        <div className="brand-gradient relative overflow-hidden rounded-3xl p-5 text-white shadow-brand">
          <div className="pointer-events-none absolute -right-10 -top-14 h-44 w-44 rounded-full bg-white/10" />
          <div className="relative flex items-center justify-between">
            <Chip tone="white">{session?.machine_id ?? '…'} · Lobby A</Chip>
            <span className="flex items-center gap-1.5 text-[12px] font-semibold text-white/90">
              <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime opacity-70" /><span className="relative inline-flex h-2 w-2 rounded-full bg-lime" /></span>
              {session?.status === 'ended' ? 'Ended' : 'Listening for items'}
            </span>
          </div>
          <div className="relative mt-5 text-[12.5px] text-white/80">Points this session</div>
          <div className="relative flex items-end gap-2">
            <CountUp value={session?.points ?? 0} className="text-[56px] font-extrabold leading-none tracking-tight" />
            <span className="pb-2 text-[14px] font-semibold text-white/80">pts</span>
            <AnimatePresence>
              {floats.map((f) => (
                <motion.span
                  key={f.id}
                  initial={{ opacity: 0, y: 10, scale: 0.9 }}
                  animate={{ opacity: 1, y: -34, scale: 1.05 }}
                  exit={{ opacity: 0, y: -60 }}
                  transition={{ duration: 0.9, ease: 'easeOut' }}
                  className={`absolute left-28 bottom-6 rounded-full px-3 py-1 text-[15px] font-extrabold ${f.bad ? 'bg-coral text-white' : 'bg-white text-brand-deep'}`}
                >
                  {f.text}
                </motion.span>
              ))}
            </AnimatePresence>
          </div>
          <div className="relative mt-4 grid grid-cols-3 gap-2">
            <Stat label="PET bottles" value={session?.pet_count ?? 0} />
            <Stat label="Cans" value={session?.can_count ?? 0} />
            <Stat label="Balance" value={balance} />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-2xl bg-brand-soft px-3 py-2.5 text-[13px] text-brand-deep">
          <Leaf size={16} /> Drop PET bottles or aluminium cans into the station. Points appear here instantly.
        </div>

        <div className="mt-4 card divide-y divide-line">
          <div className="px-4 py-3 text-[13px] font-bold">Items</div>
          {feed.length === 0 && <div className="px-4 py-5 text-[13px] text-ink-3">Nothing yet — insert your first bottle or can.</div>}
          <AnimatePresence initial={false}>
            {feed.map((d) => <FeedRow key={d.id} d={d} />)}
          </AnimatePresence>
        </div>

        <div className="sticky bottom-0 -mx-4 mt-4 bg-page/90 px-4 pb-4 pt-2 backdrop-blur safe-b">
          <Button onClick={end} disabled={ending || session?.status === 'ended'} variant="primary">
            {ending ? 'Ending…' : 'End session'}
          </Button>
        </div>
      </div>

      <Sheet open={summary} onClose={() => nav('/')} title="Session complete">
        <div className="rounded-2xl bg-brand-soft p-4 text-center">
          <div className="text-[13px] font-semibold text-brand-deep">You earned</div>
          <div className="tnum text-[44px] font-extrabold leading-none text-brand-deep">{formatSigned(session?.points ?? 0)}</div>
          <div className="mt-1 text-[13px] text-ink-2">
            {session?.pet_count ?? 0} PET · {session?.can_count ?? 0} cans
            {session?.rejected_count ? ` · ${session.rejected_count} not accepted` : ''}
          </div>
        </div>
        <div className="mt-3 text-center text-[13px] text-ink-3">New balance: <b className="tnum text-ink">{formatInt(balance)}</b> pts</div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={() => nav('/rewards')}>Redeem</Button>
          <Button onClick={() => nav('/')}>Done</Button>
        </div>
      </Sheet>
    </Page>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white/15 px-3 py-2">
      <div className="text-[11px] text-white/80">{label}</div>
      <CountUp value={value} className="text-[20px] font-extrabold" />
    </div>
  );
}

function FeedRow({ d }: { d: Deposit }) {
  const bad = d.material === 'rejected';
  return (
    <motion.div
      initial={{ opacity: 0, y: -8, backgroundColor: bad ? 'rgba(235,87,87,0.12)' : 'rgba(11,157,99,0.12)' }}
      animate={{ opacity: 1, y: 0, backgroundColor: 'rgba(255,255,255,0)' }}
      transition={{ duration: 0.9 }}
      className="flex items-center gap-3 px-4 py-3"
    >
      <span className={`flex h-9 w-9 items-center justify-center rounded-full ${bad ? 'bg-coral/12 text-coral' : d.material === 'can' ? 'bg-can/12 text-can' : 'bg-pet/12 text-pet'}`}>
        {bad ? <X size={16} /> : <Check size={16} />}
      </span>
      <div className="flex-1 text-[14px] font-semibold">{MATERIAL_LABEL[d.material]}</div>
      <div className={`tnum text-[14px] font-bold ${bad ? 'text-coral' : 'text-brand'}`}>{bad ? '0' : `+${d.points}`}</div>
    </motion.div>
  );
}
