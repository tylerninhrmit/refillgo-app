import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { RotateCcw } from 'lucide-react';
import { PhoneSession, type MockItem } from './PhoneMock';
import { SectionHead } from './Sections';

type Kind = 'pet' | 'can' | 'glass';
const ITEMS: Record<Kind, { emoji: string; label: string; material: MockItem['material']; points: number }> = {
  pet: { emoji: '🧴', label: 'PET bottle', material: 'pet', points: 10 },
  can: { emoji: '🥫', label: 'Aluminium can', material: 'can', points: 15 },
  glass: { emoji: '🫙', label: 'Glass jar', material: 'rejected', points: 0 },
};

export function Simulator() {
  const [items, setItems] = useState<MockItem[]>([]);
  const [points, setPoints] = useState(0);
  const [falling, setFalling] = useState<{ id: number; emoji: string } | null>(null);
  const [screen, setScreen] = useState<{ text: string; sub: string; bad: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const idRef = useRef(0);

  const drop = (kind: Kind) => {
    if (busy) return;
    const it = ITEMS[kind];
    const id = ++idRef.current;
    setBusy(true);
    setFalling({ id, emoji: it.emoji });
    window.setTimeout(() => {
      setFalling(null);
      if (it.material === 'rejected') setScreen({ text: 'Not accepted', sub: "Sorry, we can't take that one — PET bottles and aluminium cans only", bad: true });
      else {
        setScreen({ text: `+${it.points}`, sub: `${it.label} · Green Points credited instantly`, bad: false });
        setPoints((p) => p + it.points);
      }
      setItems((list) => [...list, { id, material: it.material }]);
      window.setTimeout(() => {
        setScreen(null);
        setBusy(false);
      }, 1500);
    }, 750);
  };

  const reset = () => {
    setItems([]);
    setPoints(0);
    setScreen(null);
  };

  const pet = items.filter((i) => i.material === 'pet').length;
  const can = items.filter((i) => i.material === 'can').length;

  return (
    <section id="try" className="mx-auto max-w-6xl px-5 py-20">
      <SectionHead eyebrow="Try the station" title="Built-in sensors identify the material and reject unsuitable items." sub="Drop an item into the simulated station — the phone on the right shows what the resident sees." />
      <div className="mt-10 grid items-center gap-10 lg:grid-cols-[1.1fr_auto]">
        <div className="flex flex-col items-center gap-6 md:flex-row md:items-end md:justify-center">
          {/* machine */}
          <div className="relative w-[300px]">
            <div className="rounded-[30px] bg-ink p-4 text-white shadow-float">
              <div className={`relative overflow-hidden rounded-2xl p-4 transition-colors duration-300 ${screen ? (screen.bad ? 'bg-coral' : 'bg-brand') : 'bg-white/8'}`} style={{ minHeight: 132 }}>
                <AnimatePresence mode="wait">
                  {screen ? (
                    <motion.div key={screen.text + items.length} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="text-center">
                      <div className="tnum text-[44px] font-extrabold leading-none">{screen.text}</div>
                      <div className="mt-2 text-[12px] font-semibold text-white/90">{screen.sub}</div>
                    </motion.div>
                  ) : (
                    <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-lime">RefillGo Station · SG-SUN-01</div>
                      <div className="mt-2 text-[15px] font-bold">Insert a PET bottle or aluminium can</div>
                      <div className="mt-3 flex justify-center gap-4 text-[11px] text-white/70"><span>PET <b className="text-white">{pet}</b></span><span>Cans <b className="text-white">{can}</b></span><span>Points <b className="text-lime">{points}</b></span></div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              {/* slot */}
              <div className="relative mt-4 h-24">
                <div className="absolute inset-x-6 top-8 h-10 rounded-full bg-black/60 shadow-[inset_0_6px_14px_rgba(0,0,0,.7)]" />
                <div className="absolute inset-x-10 top-10 h-6 rounded-full bg-black" />
                <AnimatePresence>
                  {falling && (
                    <motion.div
                      key={falling.id}
                      initial={{ y: -110, scale: 1.1, opacity: 0 }}
                      animate={{ y: [-110, 6, 14], scale: [1.1, 1, 0.35], opacity: [0, 1, 0] }}
                      transition={{ duration: 0.75, times: [0, 0.6, 1], ease: 'easeIn' }}
                      className="absolute left-1/2 top-2 -translate-x-1/2 text-[44px] leading-none"
                    >
                      {falling.emoji}
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="absolute inset-x-4 bottom-0 flex justify-between text-[10px] text-white/50"><span>Material recognition</span><span>Compaction</span></div>
              </div>
              <div className="mt-2 h-2 rounded-full bg-white/10"><motion.div className="h-full rounded-full bg-lime" animate={{ width: `${Math.min(100, 68 + (pet + can) * 2)}%` }} /></div>
              <div className="mt-1 flex justify-between text-[10px] text-white/50"><span>Bin fill level</span><span>{Math.min(100, 68 + (pet + can) * 2)}%</span></div>
            </div>
            <div className="mx-auto h-4 w-[240px] rounded-b-3xl bg-ink/70" />
          </div>
          {/* controls */}
          <div className="flex flex-col gap-2.5">
            {(Object.keys(ITEMS) as Kind[]).map((k) => (
              <button key={k} type="button" onClick={() => drop(k)} disabled={busy} className="press flex items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3 text-left shadow-card disabled:opacity-60">
                <span className="text-3xl">{ITEMS[k].emoji}</span>
                <span>
                  <span className="block text-[14px] font-bold">Drop a {ITEMS[k].label.toLowerCase()}</span>
                  <span className={`block text-[12px] font-semibold ${ITEMS[k].points ? 'text-brand' : 'text-coral'}`}>{ITEMS[k].points ? `+${ITEMS[k].points} Green Points` : 'Unsuitable item · rejected'}</span>
                </span>
              </button>
            ))}
            <button type="button" onClick={reset} className="press mt-1 inline-flex items-center justify-center gap-1.5 text-[12.5px] font-semibold text-ink-3"><RotateCcw size={14} /> Reset</button>
          </div>
        </div>
        <div className="mx-auto"><PhoneSession points={points} items={items} /></div>
      </div>
    </section>
  );
}
