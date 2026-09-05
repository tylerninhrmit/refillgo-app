import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, MapPin, ScanLine } from 'lucide-react';
import { PhoneHome } from './PhoneMock';

const TOASTS = [
  { id: 1, big: '+15', text: 'Aluminium can', bad: false },
  { id: 2, big: '+10', text: 'PET bottle', bad: false },
  { id: 3, big: '✕', text: 'Glass jar · not accepted', bad: true },
];

export function Hero({ appLink, userName, cta }: { appLink: string; userName?: string; cta: string }) {
  const nav = useNavigate();
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const stageY = useTransform(scrollY, [0, 700], [0, reduce ? 0 : -60]);
  const [idx, setIdx] = useState(0);
  const [show, setShow] = useState(true);

  useEffect(() => {
    const t = window.setInterval(() => {
      setShow(false);
      window.setTimeout(() => {
        setIdx((i) => (i + 1) % TOASTS.length);
        setShow(true);
      }, 450);
    }, 3000);
    return () => window.clearInterval(t);
  }, []);
  const toast = TOASTS[idx];

  return (
    <section id="top" className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -right-48 -top-48 h-[640px] w-[640px] rounded-full bg-brand-soft" />
        <div className="absolute -left-40 top-80 h-96 w-96 rounded-full bg-lime/20 blur-3xl" />
      </div>
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-14 pt-12 md:grid-cols-[1.1fr_1fr] md:gap-8 md:pb-24 md:pt-20">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[12px] font-semibold text-brand-deep shadow-card"><MapPin size={14} /> Sunrise Tower · Station SG-SUN-01 · Lobby A</div>
          <h1 className="mt-5 text-[38px] font-extrabold leading-[1.08] tracking-tight md:text-[56px]">
            A <span className="text-brand">reward-based</span> reverse vending machine placed in the lobby of your apartment building.
          </h1>
          <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-ink-2 md:text-[19px]">
            RefillGo provides a convenient way to recycle PET bottles and aluminium cans while receiving practical rewards and information about recycling outcomes.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <button type="button" onClick={() => nav(appLink)} className="press inline-flex items-center gap-2 rounded-2xl brand-gradient px-6 py-3.5 text-[16px] font-bold text-white shadow-brand">
              <ScanLine size={20} /> {cta}
            </button>
            <a href="#try" className="press inline-flex items-center gap-2 rounded-2xl border border-line bg-white px-6 py-3.5 text-[16px] font-bold text-ink-2">
              Try the station <ChevronRight size={18} />
            </a>
          </div>
          <div className="mt-8 flex flex-wrap gap-2.5">
            <Chip>🧴 PET bottle <b className="text-brand">+10 pts</b></Chip>
            <Chip>🥫 Aluminium can <b className="text-brand">+15 pts</b></Chip>
            <Chip>1 Green Point ≈ 25 đ refill value</Chip>
          </div>
        </motion.div>

        <motion.div style={{ y: stageY }} className="relative mx-auto h-[600px] w-full max-w-[520px]">
          <motion.div
            initial={{ opacity: 0, x: 40, rotate: -6 }}
            animate={{ opacity: 1, x: 0, rotate: -6 }}
            transition={{ delay: 0.15, duration: 0.6 }}
            className="absolute left-0 top-8 hidden w-[250px] overflow-hidden rounded-[32px] shadow-float sm:block"
            style={{ aspectRatio: '9 / 16' }}
          >
            <video src="/landing/hero.mp4" autoPlay muted loop playsInline preload="metadata" className="h-full w-full object-cover" />
            <div className="absolute bottom-3 left-3 rounded-full bg-white/85 px-3 py-1 text-[11px] font-semibold text-ink-2 backdrop-blur">Stock footage · Pexels</div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={reduce ? { opacity: 1, y: 0 } : { opacity: 1, y: [0, -8, 0] }}
            transition={reduce ? { duration: 0.5 } : { opacity: { duration: 0.5 }, y: { duration: 5, repeat: Infinity, ease: 'easeInOut' } }}
            className="absolute left-1/2 top-8 -translate-x-1/2 sm:left-auto sm:right-0 sm:translate-x-0"
          >
            <PhoneHome name={userName} />
          </motion.div>
          <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 sm:left-auto sm:right-2 sm:translate-x-0">
            <AnimatePresence mode="wait">
              {show && (
                <motion.div
                  key={toast.id}
                  initial={{ opacity: 0, y: 24, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -28, scale: 0.96 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-2.5 shadow-float ${toast.bad ? 'bg-coral text-white' : 'bg-white text-ink'}`}
                >
                  <span className={`tnum text-[28px] font-extrabold leading-none ${toast.bad ? '' : 'text-brand'}`}>{toast.big}</span>
                  <span className="text-[13px] font-semibold">{toast.text}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export function Chip({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 text-[13px] font-medium text-ink-2">{children}</span>;
}
