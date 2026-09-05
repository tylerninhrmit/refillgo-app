import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { PhoneSession } from './PhoneMock';
import { SectionHead } from './Sections';

const STEPS = [
  { t: 'Scan and feed', body: 'A resident scans the QR code on the machine, or enters a phone number, to open a session, then feeds in empty PET bottles or aluminium cans.', img: '/landing/rvm.jpg', alt: 'Reverse vending machines in a lobby', credit: 'Asurnipal · CC BY-SA 4.0' },
  { t: 'Sensors identify the material', body: 'Built-in sensors identify the material and reject unsuitable items, keeping the stream clean enough for recycling partners to accept.', img: '/landing/cans.jpg', alt: 'Crushed aluminium cans', credit: 'Ruth Hartnup · CC BY 2.0' },
  { t: 'Points credited instantly', body: "Valid containers are compacted to a fraction of their volume and Green Points are credited instantly to the resident's account in the Green Points app.", img: '', alt: '', credit: '' },
  { t: 'Redeem refills and vouchers', body: 'Points can be redeemed for refill products such as detergent and shampoo, or for partner vouchers.', img: '', alt: '', credit: '' },
  { t: 'Collection partner notified', body: 'When the bin nears capacity, the machine notifies the collection partner, and every pick-up is logged, so building management can always see what was collected and where it went.', img: '/landing/worker.jpg', alt: 'Collector sorting bottles', credit: 'PattayaPatrol · CC BY-SA 4.0' },
];

export function Stepper() {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(Number((visible.target as HTMLElement).dataset.step));
      },
      { rootMargin: '-35% 0px -45% 0px', threshold: [0.1, 0.5, 0.9] },
    );
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <section id="how" className="mx-auto max-w-6xl px-5 py-20">
      <SectionHead eyebrow="How RefillGo works" title="RefillGo Station is a reward-based reverse vending machine placed in the lobby of an apartment building." />
      <div className="mt-12 grid gap-10 md:grid-cols-[1fr_1.1fr]">
        <ol className="space-y-6">
          {STEPS.map((s, i) => (
            <li key={s.t} ref={(el) => { refs.current[i] = el; }} data-step={i} onMouseEnter={() => setActive(i)} className={`flex gap-4 rounded-3xl p-5 transition-all duration-300 ${active === i ? 'bg-white shadow-card' : 'opacity-60 hover:opacity-90'}`}>
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[15px] font-extrabold transition-colors ${active === i ? 'brand-gradient text-white' : 'bg-line text-ink-2'}`}>{i + 1}</span>
              <div>
                <div className="text-[17px] font-bold">{s.t}</div>
                <p className="mt-1.5 text-[14.5px] leading-relaxed text-ink-2">{s.body}</p>
                <div className="mt-4 md:hidden"><Visual step={i} /></div>
              </div>
            </li>
          ))}
        </ol>
        <div className="hidden md:block">
          <div className="sticky top-24 h-[560px] overflow-hidden rounded-[32px] bg-ink shadow-float">
            <AnimatePresence mode="wait">
              <motion.div key={active} initial={{ opacity: 0, scale: 1.04 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} className="absolute inset-0">
                <Visual step={active} tall />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}

function Visual({ step, tall = false }: { step: number; tall?: boolean }) {
  const s = STEPS[step];
  if (s.img) {
    return (
      <div className={`relative overflow-hidden ${tall ? 'h-full' : 'h-56 rounded-2xl'}`}>
        <img src={s.img} alt={s.alt} loading="lazy" className="h-full w-full object-cover" />
        <div className="absolute bottom-3 right-3 rounded-full bg-black/45 px-2.5 py-1 text-[10.5px] text-white/85 backdrop-blur">Photo: {s.credit}</div>
      </div>
    );
  }
  if (step === 2) {
    return (
      <div className={`flex items-center justify-center bg-brand-soft ${tall ? 'h-full' : 'rounded-2xl py-6'}`}>
        <div className={tall ? 'scale-95' : 'scale-[.85]'}><PhoneSession points={25} items={[{ id: 1, material: 'can' }, { id: 2, material: 'pet' }]} /></div>
      </div>
    );
  }
  const rewards = [['🫧', 'Dishwash refill', '500'], ['🧴', 'Shampoo refill', '700'], ['🎟', 'Voucher 20,000 đ', '800'], ['☕', 'Espresso', '600']];
  return (
    <div className={`grid grid-cols-2 gap-3 bg-page p-6 ${tall ? 'h-full content-center' : 'rounded-2xl'}`}>
      {rewards.map(([e, t, p]) => (
        <div key={t} className="card p-4 text-center">
          <div className="text-4xl">{e}</div>
          <div className="mt-2 text-[13px] font-bold">{t}</div>
          <div className="tnum text-[12px] font-extrabold text-brand">{p} pts</div>
        </div>
      ))}
    </div>
  );
}
