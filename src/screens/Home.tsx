import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Bell, Eye, EyeOff, ScanLine, Gift, Clock, Route, Recycle, MapPin, Leaf, HelpCircle, Share2,
  Sparkles, Store, ChevronRight, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import { api, type HistoryItem } from '../lib/api';
import { useStore } from '../lib/store';
import { toVnd } from '../lib/points';
import { formatVnd, formatWhen, formatSigned, firstName } from '../lib/format';
import { Avatar, Card, Chip, IconTile, Page, SectionTitle } from '../components/ui';
import { CountUp } from '../components/CountUp';
import { Sheet } from '../components/Sheet';
import { useToast } from '../components/Toast';

const PROMOS = [
  { id: 'p1', tag: 'Sponsor offer', title: '2× Green Points on cans this week', body: 'Reward sponsor campaign · Sunrise Tower', tone: 'brand-gradient text-white' },
  { id: 'p2', tag: 'Lobby café', title: 'Espresso for 600 points', body: 'Show your redemption code at the counter', tone: 'bg-amber/15 text-ink' },
  { id: 'p3', tag: 'Last pick-up', title: '18.2 kg collected on 1 Sep', body: 'GreenLoop Recycling (demo) · verified batch', tone: 'bg-sky/12 text-ink' },
];

export function Home() {
  const nav = useNavigate();
  const toast = useToast();
  const { user, balance, hideBalance, toggleHide, setBalance, session, setSession } = useStore();
  const [history, setHistory] = useState<HistoryItem[] | null>(null);
  const [sheet, setSheet] = useState<null | 'accepted' | 'stations' | 'how' | 'support'>(null);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    const load = async () => {
      try {
        const [me, h] = await Promise.all([api.getMe(user.id), api.getHistory(user.id)]);
        if (!alive) return;
        if (me.status === 'ok') {
          setBalance(me.profile.points);
          setSession(me.active_session);
        }
        setHistory(h);
      } catch {
        /* offline: keep cached values */
      }
    };
    void load();
    const onVis = () => document.visibilityState === 'visible' && void load();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      alive = false;
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [user, setBalance, setSession]);

  if (!user) return null;
  const greeting = (() => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  })();

  return (
    <Page>
      {/* Header */}
      <div className="brand-gradient relative overflow-hidden px-4 pb-14 pt-3 text-white safe-t">
        <div className="pointer-events-none absolute -right-10 -top-16 h-52 w-52 rounded-full bg-white/10" />
        <div className="relative flex items-center gap-3">
          <button type="button" onClick={() => nav('/me')} aria-label="Profile" className="press">
            <Avatar name={user.name} light />
          </button>
          <div className="min-w-0 flex-1">
            <div className="text-[12.5px] text-white/80">{greeting},</div>
            <div className="truncate text-[17px] font-bold leading-tight">{firstName(user.name)} 👋</div>
          </div>
          <Chip tone="white"><MapPin size={12} /> {user.building}</Chip>
          <button type="button" aria-label="Notifications" onClick={() => toast('No new notifications', 'info')} className="press relative flex h-10 w-10 items-center justify-center rounded-full bg-white/15">
            <Bell size={20} />
            <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-lime ring-2 ring-brand" />
          </button>
        </div>
      </div>

      {/* Balance card */}
      <div className="-mt-10 px-4">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[12.5px] font-semibold text-ink-3">
              <Leaf size={14} className="text-brand" /> Green Points
            </div>
            <button type="button" onClick={toggleHide} aria-label={hideBalance ? 'Show balance' : 'Hide balance'} className="press flex h-8 w-8 items-center justify-center rounded-full bg-page text-ink-3">
              {hideBalance ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <div className="mt-1 flex items-end gap-2">
            {hideBalance ? (
              <span className="text-[38px] font-extrabold leading-none tracking-tight">••••</span>
            ) : (
              <CountUp value={balance} className="text-[38px] font-extrabold leading-none tracking-tight" />
            )}
            <span className="pb-1 text-[13px] font-semibold text-ink-3">pts</span>
          </div>
          <div className="mt-1 text-[12.5px] text-ink-3">
            ≈ {hideBalance ? '•••••' : formatVnd(toVnd(balance))} refill value
          </div>
          {session && session.status === 'active' && (
            <button type="button" onClick={() => nav(`/session/${session.id}`)} className="press mt-3 flex w-full items-center justify-between rounded-2xl bg-brand-soft px-3 py-2.5 text-left">
              <span className="flex items-center gap-2 text-[13px] font-semibold text-brand-deep">
                <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-60" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-brand" /></span>
                Deposit session in progress · {session.machine_id}
              </span>
              <ChevronRight size={16} className="text-brand-deep" />
            </button>
          )}
          <div className="mt-4 grid grid-cols-4 gap-1">
            <Quick icon={<ScanLine size={22} />} label="Scan" onClick={() => nav('/scan')} />
            <Quick icon={<Gift size={22} />} label="Rewards" onClick={() => nav('/rewards')} />
            <Quick icon={<Clock size={22} />} label="Activity" onClick={() => nav('/history')} />
            <Quick icon={<Route size={22} />} label="Journey" onClick={() => nav('/journey')} />
          </div>
        </motion.div>
      </div>

      {/* Services grid */}
      <div className="mt-5 px-4">
        <SectionTitle>Services</SectionTitle>
        <Card className="grid grid-cols-4 gap-y-3 px-2 py-3">
          <IconTile icon={<Recycle size={24} />} label="Accepted items" color="brand" onClick={() => setSheet('accepted')} />
          <IconTile icon={<MapPin size={24} />} label="Stations" color="sky" onClick={() => setSheet('stations')} />
          <IconTile icon={<Sparkles size={24} />} label="My impact" color="teal" onClick={() => nav('/me')} />
          <IconTile icon={<HelpCircle size={24} />} label="How it works" color="violet" onClick={() => setSheet('how')} />
          <IconTile icon={<Store size={24} />} label="Sponsors" color="amber" onClick={() => nav('/rewards')} />
          <IconTile icon={<Route size={24} />} label="Where it goes" color="brand" onClick={() => nav('/journey')} />
          <IconTile icon={<Share2 size={24} />} label="Invite" color="coral" onClick={() => share(toast)} />
          <IconTile icon={<Bell size={24} />} label="Support" color="sky" onClick={() => setSheet('support')} />
        </Card>
      </div>

      {/* Promo carousel */}
      <div className="mt-5">
        <div className="px-4"><SectionTitle>Offers for you</SectionTitle></div>
        <div className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1">
          {PROMOS.map((p) => (
            <div key={p.id} className={`min-w-[78%] snap-start rounded-2xl p-4 shadow-card ${p.tone}`}>
              <div className="text-[11px] font-semibold uppercase tracking-wider opacity-80">{p.tag}</div>
              <div className="mt-1 text-[16px] font-bold leading-snug">{p.title}</div>
              <div className="mt-1 text-[12.5px] opacity-80">{p.body}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent activity */}
      <div className="mt-5 px-4">
        <SectionTitle action="See all" onAction={() => nav('/history')}>Recent activity</SectionTitle>
        <Card className="divide-y divide-line">
          {history === null && <div className="p-4 text-[13px] text-ink-3">Loading…</div>}
          {history && history.length === 0 && <div className="p-4 text-[13px] text-ink-3">No activity yet. Scan a station to start.</div>}
          {history?.slice(0, 4).map((h) => <ActivityRow key={h.id} item={h} />)}
        </Card>
      </div>

      <div className="px-6 pb-2 pt-5 text-center text-[11px] text-ink-3">Points and rewards are for demonstration purposes.</div>

      <Sheet open={sheet === 'accepted'} onClose={() => setSheet(null)} title="What the station accepts">
        <ul className="space-y-3 text-[14px]">
          <li className="flex items-start gap-3"><span className="text-2xl">🧴</span><div><b>PET bottles</b> — empty drink bottles, caps on or off. <span className="text-brand font-semibold">+10 pts</span></div></li>
          <li className="flex items-start gap-3"><span className="text-2xl">🥫</span><div><b>Aluminium cans</b> — empty, crushed or not. <span className="text-brand font-semibold">+15 pts</span></div></li>
          <li className="flex items-start gap-3"><span className="text-2xl">🚫</span><div><b>Not accepted</b> — glass, paper cups, tetra packs, plastic bags. The station identifies the material and rejects them automatically.</div></li>
        </ul>
      </Sheet>
      <Sheet open={sheet === 'stations'} onClose={() => setSheet(null)} title="Stations near you">
        <div className="flex items-center gap-3 rounded-2xl bg-page p-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand-deep"><MapPin size={22} /></div>
          <div className="flex-1">
            <div className="text-[14px] font-bold">SG-SUN-01 · Lobby A</div>
            <div className="text-[12.5px] text-ink-3">Sunrise Tower · Ground floor, next to the mailboxes</div>
          </div>
          <Chip>Online</Chip>
        </div>
        <p className="mt-3 text-[12.5px] text-ink-3">Pilot: 5 rented machines across 5 apartment buildings in Ho Chi Minh City.</p>
      </Sheet>
      <Sheet open={sheet === 'how'} onClose={() => setSheet(null)} title="How RefillGo works">
        <ol className="space-y-2.5 text-[14px]">
          {['Scan the QR code on the station (or enter the station code).', 'Feed in empty PET bottles or aluminium cans. Sensors identify the material and reject unsuitable items.', 'Green Points are credited instantly to your account.', 'Redeem points for refill products or partner vouchers.', 'When the bin nears capacity the machine notifies the collection partner, and every pick-up is logged.'].map((s, i) => (
            <li key={i} className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-[12px] font-bold text-white">{i + 1}</span><span>{s}</span></li>
          ))}
        </ol>
      </Sheet>
      <Sheet open={sheet === 'support'} onClose={() => setSheet(null)} title="Support">
        <p className="text-[14px]">Something stuck in the station or points missing? Contact the building management desk or the RefillGo team.</p>
        <p className="mt-2 text-[12.5px] text-ink-3">Demo build · RefillGo Station · BUSM3299</p>
      </Sheet>
    </Page>
  );
}

function Quick({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="press flex flex-col items-center gap-1.5 rounded-2xl py-2">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-soft text-brand-deep">{icon}</span>
      <span className="text-[11.5px] font-semibold text-ink-2">{label}</span>
    </button>
  );
}

export function ActivityRow({ item }: { item: HistoryItem }) {
  const isDeposit = item.kind === 'deposit';
  const title = isDeposit
    ? `Deposit · ${[item.pet ? `${item.pet} PET` : '', item.can ? `${item.can} can${item.can > 1 ? 's' : ''}` : ''].filter(Boolean).join(' + ') || 'no items'}`
    : `Redeemed · ${item.title}`;
  const sub = isDeposit ? `${item.machine_id} · ${formatWhen(item.at)}` : `Code ${item.code} · ${formatWhen(item.at)}`;
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className={`flex h-10 w-10 items-center justify-center rounded-full ${isDeposit ? 'bg-brand-soft text-brand-deep' : 'bg-amber/15 text-amber'}`}>
        {isDeposit ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-semibold">{title}</div>
        <div className="truncate text-[12px] text-ink-3">{sub}</div>
      </div>
      <div className={`tnum text-[14px] font-bold ${item.points >= 0 ? 'text-brand' : 'text-ink-2'}`}>{formatSigned(item.points)}</div>
    </div>
  );
}

async function share(toast: (t: string, tone?: 'ok' | 'err' | 'info') => void) {
  const url = window.location.origin;
  try {
    if (navigator.share) await navigator.share({ title: 'RefillGo Green Points', text: 'Deposit bottles, earn Green Points, redeem refills.', url });
    else {
      await navigator.clipboard.writeText(url);
      toast('Link copied', 'ok');
    }
  } catch {
    /* cancelled */
  }
}
