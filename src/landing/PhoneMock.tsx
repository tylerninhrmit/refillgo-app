import { motion, AnimatePresence } from 'framer-motion';
import { Leaf, ScanLine, Gift, Clock, Route, Recycle, MapPin, Sparkles, HelpCircle, BadgeCheck, Users, Check, X } from 'lucide-react';
import { CountUp } from '../components/CountUp';

const Frame = ({ children }: { children: React.ReactNode }) => (
  <div className="relative w-[272px] shrink-0 overflow-hidden rounded-[40px] border-[6px] border-ink bg-page shadow-float" style={{ height: 560 }}>
    {children}
  </div>
);

/** Static mock of the member Home screen (mirrors src/screens/Home.tsx). */
export function PhoneHome({ name = 'Dat Ninh' }: { name?: string }) {
  const first = name.trim().split(/\s+/)[0] ?? 'there';
  const initials = name.split(/\s+/).filter(Boolean).slice(-2).map((s) => s[0]?.toUpperCase()).join('') || 'R';
  const quick = [[<ScanLine size={18} key="q1" />, 'Scan'], [<Gift size={18} key="q2" />, 'Rewards'], [<Clock size={18} key="q3" />, 'Activity'], [<Route size={18} key="q4" />, 'Journey']] as const;
  const services = [['bg-brand-soft text-brand-deep', <Recycle size={18} key="a" />, 'Accepted'], ['bg-sky/12 text-sky', <MapPin size={18} key="b" />, 'Stations'], ['bg-teal/12 text-teal', <Sparkles size={18} key="c" />, 'Impact'], ['bg-violet/12 text-violet', <HelpCircle size={18} key="d" />, 'How it works']] as const;
  return (
    <Frame>
      <div className="brand-gradient px-4 pb-12 pt-6 text-white">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/25 text-[13px] font-bold ring-2 ring-white/40">{initials}</span>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] text-white/80">Good evening,</div>
            <div className="truncate text-[14px] font-bold leading-tight">{first} 👋</div>
          </div>
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-[9px] font-semibold">Sunrise Tower</span>
        </div>
      </div>
      <div className="relative z-10 -mt-8 px-3">
        <div className="card p-3">
          <div className="flex items-center gap-1 text-[10px] font-semibold text-ink-3"><Leaf size={11} className="text-brand" /> Green Points</div>
          <div className="mt-0.5 flex items-end gap-1"><span className="tnum text-[30px] font-extrabold leading-none">1,500</span><span className="pb-0.5 text-[10px] font-semibold text-ink-3">pts</span></div>
          <div className="text-[10px] text-ink-3">≈ 37,500 đ refill value</div>
          <div className="mt-3 grid grid-cols-4 gap-1">
            {quick.map(([icon, label]) => (
              <div key={label} className="flex flex-col items-center gap-1">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-soft text-brand-deep">{icon}</span>
                <span className="text-[9px] font-semibold text-ink-2">{label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-3 text-[11px] font-bold">Services</div>
        <div className="card mt-1.5 grid grid-cols-4 gap-1 px-1 py-2">
          {services.map(([cls, icon, label]) => (
            <div key={label} className="flex flex-col items-center gap-1">
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${cls}`}>{icon}</span>
              <span className="text-[8.5px] font-medium text-ink-2">{label}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 text-[11px] font-bold">Offers for you</div>
        <div className="mt-1.5 rounded-2xl brand-gradient p-3 text-white">
          <div className="text-[8px] font-semibold uppercase tracking-wider opacity-80">Sponsor offer</div>
          <div className="text-[11px] font-bold leading-snug">2× Green Points on cans this week</div>
        </div>
      </div>
      <TabBarMock />
    </Frame>
  );
}

export interface MockItem { id: number; material: 'pet' | 'can' | 'rejected' }

/** Mock of the live deposit session screen, driven by the simulator. */
export function PhoneSession({ points, items }: { points: number; items: MockItem[] }) {
  const pet = items.filter((i) => i.material === 'pet').length;
  const can = items.filter((i) => i.material === 'can').length;
  return (
    <Frame>
      <div className="px-3 pt-5">
        <div className="flex items-center justify-between text-[11px] font-bold"><span>Deposit session</span><span className="rounded-full bg-brand-soft px-2 py-0.5 text-[9px] text-brand-deep">● Live</span></div>
        <div className="brand-gradient relative mt-2 overflow-hidden rounded-2xl p-3 text-white">
          <div className="flex items-center justify-between text-[9px]"><span className="rounded-full bg-white/20 px-2 py-0.5 font-semibold">SG-SUN-01 · Lobby A</span><span className="text-white/85">Listening for items</span></div>
          <div className="mt-3 text-[9px] text-white/80">Points this session</div>
          <div className="flex items-end gap-1"><CountUp value={points} className="text-[40px] font-extrabold leading-none" /><span className="pb-1 text-[10px] font-semibold text-white/80">pts</span></div>
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            {[['PET', pet], ['Cans', can], ['Balance', 1500 + points]].map(([l, v]) => (
              <div key={l as string} className="rounded-xl bg-white/15 px-2 py-1.5"><div className="text-[8px] text-white/80">{l}</div><div className="tnum text-[14px] font-extrabold">{(v as number).toLocaleString('en-US')}</div></div>
            ))}
          </div>
        </div>
        <div className="mt-2 rounded-xl bg-brand-soft px-2.5 py-1.5 text-[9px] text-brand-deep">Drop PET bottles or aluminium cans into the station. Points appear here instantly.</div>
        <div className="card mt-2 divide-y divide-line overflow-hidden">
          <div className="px-3 py-1.5 text-[10px] font-bold">Items</div>
          <div className="max-h-[168px] overflow-hidden">
            <AnimatePresence initial={false}>
              {items.length === 0 && <div className="px-3 py-3 text-[9.5px] text-ink-3">Nothing yet — insert your first bottle or can.</div>}
              {[...items].reverse().slice(0, 4).map((it) => {
                const bad = it.material === 'rejected';
                return (
                  <motion.div key={it.id} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 px-3 py-2">
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full ${bad ? 'bg-coral/12 text-coral' : it.material === 'can' ? 'bg-can/12 text-can' : 'bg-pet/12 text-pet'}`}>{bad ? <X size={12} /> : <Check size={12} />}</span>
                    <span className="flex-1 text-[10px] font-semibold">{bad ? 'Item not accepted' : it.material === 'can' ? 'Aluminium can' : 'PET bottle'}</span>
                    <span className={`tnum text-[10px] font-bold ${bad ? 'text-coral' : 'text-brand'}`}>{bad ? '0' : it.material === 'can' ? '+15' : '+10'}</span>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      </div>
      <div className="absolute inset-x-3 bottom-3 rounded-xl brand-gradient py-2 text-center text-[11px] font-bold text-white">End session</div>
    </Frame>
  );
}

function TabBarMock() {
  return (
    <div className="absolute inset-x-0 bottom-0 flex h-12 items-end justify-around border-t border-line bg-white px-2 pb-1.5 text-[8px] font-semibold text-ink-3">
      <span className="flex flex-col items-center gap-0.5 text-brand"><BadgeCheck size={14} />Home</span>
      <span className="flex flex-col items-center gap-0.5"><Gift size={14} />Rewards</span>
      <span className="relative -top-3 flex h-11 w-11 items-center justify-center rounded-full brand-gradient text-white ring-4 ring-white"><ScanLine size={18} /></span>
      <span className="flex flex-col items-center gap-0.5"><Clock size={14} />Activity</span>
      <span className="flex flex-col items-center gap-0.5"><Users size={14} />Me</span>
    </div>
  );
}
