import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, LogOut, RefreshCw, ShieldCheck, Leaf, Recycle, Gift, Info } from 'lucide-react';
import { api, type Me as MeData } from '../lib/api';
import { useStore } from '../lib/store';
import { co2Kg } from '../lib/points';
import { formatInt, maskPhone } from '../lib/format';
import { Avatar, Card, Chip, Page, TopBar } from '../components/ui';

export function Me() {
  const nav = useNavigate();
  const { user, balance, setBalance, signOut } = useStore();
  const [me, setMe] = useState<MeData | null>(null);

  useEffect(() => {
    if (!user) return;
    api.getMe(user.id).then((m) => {
      if (m.status === 'ok') {
        setMe(m);
        setBalance(m.profile.points);
      }
    }).catch(() => {});
  }, [user, setBalance]);

  if (!user) return null;
  const pet = me?.stats.pet ?? 0;
  const can = me?.stats.can ?? 0;

  return (
    <Page>
      <TopBar title="Me" />
      <div className="space-y-4 px-4">
        <Card className="flex items-center gap-3 p-4">
          <Avatar name={user.name} size={56} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[17px] font-extrabold">{user.name}</div>
            <div className="text-[12.5px] text-ink-3">{maskPhone(user.phone)} · {user.building}</div>
          </div>
          <Chip><Leaf size={12} /> {formatInt(balance)} pts</Chip>
        </Card>

        <Card className="p-4">
          <div className="text-[14px] font-bold">My impact</div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <Stat icon={<Recycle size={16} />} value={formatInt(pet + can)} label="containers" />
            <Stat icon={<Leaf size={16} />} value={co2Kg(pet, can).toFixed(1)} label="kg CO₂ avoided*" />
            <Stat icon={<Gift size={16} />} value={formatInt(me?.stats.redemptions ?? 0)} label="rewards" />
          </div>
          <div className="mt-3 text-[11.5px] text-ink-3">{pet} PET bottles · {can} aluminium cans · {me?.stats.sessions ?? 0} sessions</div>
          <div className="mt-1 flex items-start gap-1.5 text-[11px] text-ink-3"><Info size={12} className="mt-0.5 shrink-0" /> *Estimate for demo purposes (28 g per PET bottle, 46 g per can) — factors to be sourced for the report.</div>
        </Card>

        <Card className="divide-y divide-line">
          <Row icon={<Gift size={18} />} label="Rewards" onClick={() => nav('/rewards')} />
          <Row icon={<Recycle size={18} />} label="Where my containers go" onClick={() => nav('/journey')} />
          <Row icon={<RefreshCw size={18} />} label="Reload app (update)" onClick={() => reloadApp()} />
        </Card>

        <Card className="p-4 text-[12.5px] leading-relaxed text-ink-2">
          <div className="flex items-center gap-2 text-[13px] font-bold text-ink"><ShieldCheck size={16} className="text-brand" /> Demo account</div>
          <p className="mt-1">Sign-in uses your phone number without OTP and points are for demonstration only. Station data is anonymised (no personal information is shared).</p>
        </Card>

        <button type="button" onClick={() => { signOut(); nav('/login', { replace: true }); }} className="press flex w-full items-center justify-center gap-2 rounded-2xl border border-line bg-white py-3 text-[14px] font-semibold text-coral">
          <LogOut size={16} /> Sign out
        </button>
        <div className="pb-2 text-center text-[11px] text-ink-3">RefillGo Green Points · v0.1 · BUSM3299 demo</div>
      </div>
    </Page>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-page p-3">
      <div className="flex items-center gap-1 text-brand">{icon}</div>
      <div className="tnum mt-1 text-[20px] font-extrabold leading-none">{value}</div>
      <div className="mt-1 text-[11px] text-ink-3">{label}</div>
    </div>
  );
}

function Row({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="press flex w-full items-center gap-3 px-4 py-3.5 text-left">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-page text-ink-2">{icon}</span>
      <span className="flex-1 text-[14px] font-semibold">{label}</span>
      <ChevronRight size={18} className="text-ink-3" />
    </button>
  );
}

async function reloadApp() {
  try {
    const regs = await navigator.serviceWorker?.getRegistrations();
    await Promise.all((regs ?? []).map((r) => r.update()));
  } catch {
    /* ignore */
  }
  window.location.reload();
}
