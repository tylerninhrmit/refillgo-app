import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BadgeCheck, Copy } from 'lucide-react';
import { api, type Redemption, type Reward } from '../lib/api';
import { useStore } from '../lib/store';
import { formatInt, formatVnd } from '../lib/format';
import { Button, Page, Spinner, TopBar } from '../components/ui';
import { Sheet } from '../components/Sheet';
import { useToast } from '../components/Toast';

export function RewardDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const { user, balance, setBalance } = useStore();
  const [reward, setReward] = useState<Reward | null | undefined>(undefined);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Redemption | null>(null);

  useEffect(() => {
    if (id) api.getReward(id).then(setReward).catch(() => setReward(null));
  }, [id]);

  if (reward === undefined) return <Spinner />;
  if (!reward) return <Page><TopBar title="Reward" onBack={() => nav(-1)} /><div className="p-6 text-center text-ink-3">Reward not found.</div></Page>;

  const ok = balance >= reward.cost_points;

  const redeem = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const res = await api.redeemReward(user.id, reward.id);
      if (res.status === 'ok' && res.redemption) {
        if (typeof res.balance === 'number') setBalance(res.balance);
        setConfirm(false);
        setDone(res.redemption);
        if (navigator.vibrate) navigator.vibrate([30, 30, 60]);
      } else if (res.status === 'insufficient') {
        toast(`You need ${formatInt((res.needed ?? reward.cost_points) - (res.balance ?? balance))} more points.`, 'err');
        if (typeof res.balance === 'number') setBalance(res.balance);
      } else toast('This reward is not available.', 'err');
    } catch (e) {
      toast((e as Error).message, 'err');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page className="min-h-dvh">
      <TopBar title="Reward" onBack={() => nav(-1)} />
      <div className="px-4">
        <div className="card overflow-hidden">
          <div className="flex h-44 items-center justify-center bg-brand-soft text-[84px]">{reward.emoji}</div>
          <div className="p-5">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">{reward.category}</div>
            <h2 className="mt-1 text-[22px] font-extrabold leading-tight">{reward.title}</h2>
            <p className="mt-2 text-[14px] leading-relaxed text-ink-2">{reward.detail ?? reward.note}</p>
            <div className="mt-4 flex items-center justify-between rounded-2xl bg-page p-3">
              <div>
                <div className="text-[11.5px] text-ink-3">Cost</div>
                <div className="tnum text-[20px] font-extrabold text-brand">{formatInt(reward.cost_points)} pts</div>
              </div>
              <div className="text-right">
                <div className="text-[11.5px] text-ink-3">Value</div>
                <div className="tnum text-[15px] font-bold">{reward.vnd_value ? formatVnd(reward.vnd_value) : '—'}</div>
              </div>
              <div className="text-right">
                <div className="text-[11.5px] text-ink-3">Your balance</div>
                <div className={`tnum text-[15px] font-bold ${ok ? 'text-ink' : 'text-coral'}`}>{formatInt(balance)} pts</div>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-4">
          <Button onClick={() => setConfirm(true)} disabled={!ok}>
            {ok ? 'Redeem now' : `Need ${formatInt(reward.cost_points - balance)} more points`}
          </Button>
        </div>
      </div>

      <Sheet open={confirm} onClose={() => setConfirm(false)} title="Confirm redemption">
        <div className="flex items-center gap-3 rounded-2xl bg-page p-3">
          <span className="text-3xl">{reward.emoji}</span>
          <div className="flex-1">
            <div className="text-[14px] font-bold">{reward.title}</div>
            <div className="text-[12.5px] text-ink-3">{formatInt(reward.cost_points)} pts will be deducted</div>
          </div>
        </div>
        <div className="mt-3 text-[12.5px] text-ink-3">Balance after: <b className="tnum text-ink">{formatInt(balance - reward.cost_points)}</b> pts</div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button variant="ghost" onClick={() => setConfirm(false)}>Cancel</Button>
          <Button onClick={redeem} disabled={busy}>{busy ? 'Redeeming…' : 'Confirm'}</Button>
        </div>
      </Sheet>

      <Sheet open={!!done} onClose={() => nav('/rewards')} title="Redeemed 🎉">
        {done && (
          <>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 18 }} className="rounded-3xl border-2 border-dashed border-brand bg-brand-soft p-5 text-center">
              <div className="text-[12px] font-semibold text-brand-deep">Show this code at pick-up</div>
              <div className="tnum mt-1 text-[40px] font-extrabold tracking-wider text-brand-deep">{done.code}</div>
              <div className="mt-1 flex items-center justify-center gap-1 text-[12px] text-ink-2"><BadgeCheck size={14} className="text-brand" /> {reward.title}</div>
            </motion.div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button variant="secondary" onClick={() => { void navigator.clipboard?.writeText(done.code); toast('Code copied', 'ok'); }}><Copy size={16} /> Copy</Button>
              <Button onClick={() => nav('/rewards')}>Done</Button>
            </div>
          </>
        )}
      </Sheet>
    </Page>
  );
}
