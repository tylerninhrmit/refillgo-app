import { useEffect, useRef, useState } from 'react';
import { motion, useInView, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import {
  Leaf, ArrowRight, Eye, Ban, Minimize2, QrCode, Sparkles, Gift, Bell, LayoutDashboard, Truck, Users, Building2, Megaphone,
  MapPin, Factory, Recycle, Package,
} from 'lucide-react';
import { CountUp } from '../components/CountUp';

export const reveal = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.45, ease: 'easeOut' as const },
};

export function SectionHead({ eyebrow, title, sub, light = false }: { eyebrow: string; title: string; sub?: string; light?: boolean }) {
  return (
    <motion.div {...reveal} className="max-w-3xl">
      <div className={`text-[12px] font-bold uppercase tracking-wider ${light ? 'text-lime' : 'text-brand'}`}>{eyebrow}</div>
      <h2 className="mt-3 text-[26px] font-extrabold leading-tight md:text-[34px]">{title}</h2>
      {sub && <p className={`mt-3 text-[16px] leading-relaxed ${light ? 'text-white/85' : 'text-ink-2'}`}>{sub}</p>}
    </motion.div>
  );
}

/* ---------- Nav ---------- */
export function Nav({ appLink, cta }: { appLink: string; cta: string }) {
  const nav = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 12);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  return (
    <header className={`sticky top-0 z-40 transition-all ${scrolled ? 'border-b border-line/70 bg-white/85 shadow-[0_6px_24px_-20px_rgba(16,36,26,.4)] backdrop-blur' : 'bg-transparent'}`}>
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-5">
        <a href="#top" className="flex items-center gap-2.5 font-extrabold">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl brand-gradient text-white"><Leaf size={20} /></span>
          RefillGo <span className="font-medium text-ink-3">Station</span>
        </a>
        <nav className="ml-auto hidden items-center gap-6 text-[14px] font-semibold text-ink-2 md:flex">
          {[['#try', 'Try it'], ['#how', 'How it works'], ['#features', 'Features'], ['#who', "Who it's for"], ['#rewards', 'Rewards']].map(([h, l]) => (
            <a key={h} href={h} className="transition hover:text-brand">{l}</a>
          ))}
        </nav>
        <button type="button" onClick={() => nav(appLink)} className="press ml-auto inline-flex h-10 items-center gap-2 rounded-full brand-gradient px-4 text-[14px] font-bold text-white shadow-brand md:ml-0">
          {cta} <ArrowRight size={16} />
        </button>
      </div>
    </header>
  );
}

/* ---------- Stats ---------- */
const STATS = [
  { n: 20, suffix: '', label: 'residents took part in our problem interviews' },
  { n: 70, suffix: '%', label: 'currently separate PET bottles or aluminium cans' },
  { n: 47.4, suffix: '%', label: 'did not have a convenient collection point within walking distance' },
  { n: 58000, suffix: '', label: 'new apartments across 80 projects expected in HCMC by 2028' },
];
export function StatsBand() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <section ref={ref} className="border-y border-line/70 bg-white">
      <div className="mx-auto grid max-w-6xl gap-6 px-5 py-10 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map((s) => (
          <motion.div key={s.label} {...reveal}>
            <div className="tnum text-[40px] font-extrabold leading-none text-brand">
              {s.n % 1 ? (inView ? s.n : 0).toLocaleString('en-US') : <CountUp value={inView ? s.n : 0} duration={1100} />}{s.suffix}
            </div>
            <div className="mt-2 text-[14px] leading-snug text-ink-2">{s.label}</div>
          </motion.div>
        ))}
      </div>
      <div className="mx-auto max-w-6xl px-5 pb-6 text-[11.5px] text-ink-3">Problem interviews, August 2026 (n = 20; access question n = 19) · Savills (2025)</div>
    </section>
  );
}

/* ---------- Full-bleed photo band with parallax ---------- */
export function PhotoBand({ img, alt, credit, eyebrow, title, body, facts, align = 'left' }: {
  img: string; alt: string; credit: string; eyebrow: string; title: string; body?: string; facts?: { n: string; l: string }[]; align?: 'left' | 'right';
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], reduce ? ['0%', '0%'] : ['-12%', '12%']);
  return (
    <section ref={ref} className="relative min-h-[520px] overflow-hidden text-white">
      <motion.img src={img} alt={alt} loading="lazy" style={{ y }} className="absolute inset-0 h-[125%] w-full -translate-y-[12%] object-cover" />
      <div className={`absolute inset-0 ${align === 'left' ? 'bg-gradient-to-r from-ink/85 via-ink/55 to-ink/10' : 'bg-gradient-to-l from-ink/85 via-ink/55 to-ink/10'}`} />
      <div className={`relative mx-auto flex min-h-[520px] max-w-6xl flex-col justify-center px-5 py-16 ${align === 'right' ? 'items-end text-right' : ''}`}>
        <motion.div {...reveal} className="max-w-xl">
          <div className="text-[12px] font-bold uppercase tracking-wider text-lime">{eyebrow}</div>
          <h2 className="mt-3 text-[28px] font-extrabold leading-tight md:text-[40px]">{title}</h2>
          {body && <p className="mt-4 text-[16px] leading-relaxed text-white/85">{body}</p>}
          {facts && (
            <div className={`mt-6 flex flex-wrap gap-3 ${align === 'right' ? 'justify-end' : ''}`}>
              {facts.map((f) => (
                <div key={f.l} className="rounded-2xl bg-white/12 px-4 py-3 backdrop-blur">
                  <div className="tnum text-[26px] font-extrabold leading-none">{f.n}</div>
                  <div className="mt-1 max-w-[220px] text-[12px] text-white/80">{f.l}</div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
      <div className="absolute bottom-3 right-4 text-[10.5px] text-white/60">{credit}</div>
    </section>
  );
}

/* ---------- Features ---------- */
const FEATURES = [
  { icon: Eye, label: 'Material recognition for PET and aluminium', group: 0 },
  { icon: Ban, label: 'Automatic rejection of unsuitable items', group: 0 },
  { icon: Minimize2, label: 'Compaction to reduce collection frequency', group: 0 },
  { icon: QrCode, label: 'QR or phone-number sign-in', group: 1 },
  { icon: Sparkles, label: 'A Green Points balance', group: 1 },
  { icon: Gift, label: 'Redeemable refill products and vouchers', group: 1 },
  { icon: Bell, label: 'Full-capacity notification', group: 1 },
  { icon: LayoutDashboard, label: 'A management dashboard reporting volumes and participation', group: 1 },
  { icon: Truck, label: 'Recycling-partner traceability for every batch', group: 1 },
];
export function Features() {
  return (
    <section id="features" className="bg-white py-20">
      <div className="mx-auto max-w-6xl px-5">
        <SectionHead eyebrow="Key features" title="Nine features carry the concept." sub="The first three keep the machine practical to operate; the remaining six target the two harder problems, motivation and transparency." />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, label, group }, i) => (
            <motion.div
              key={label}
              {...reveal}
              transition={{ ...reveal.transition, delay: (i % 3) * 0.06 }}
              whileHover={{ y: -4 }}
              className="group flex items-center gap-4 rounded-2xl border border-line bg-page p-4 transition-shadow hover:shadow-card"
            >
              <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-colors ${group === 0 ? 'bg-brand-soft text-brand-deep group-hover:bg-brand group-hover:text-white' : 'bg-sky/12 text-sky group-hover:bg-sky group-hover:text-white'}`}><Icon size={22} /></span>
              <span className="text-[15px] font-semibold leading-snug">{label}</span>
            </motion.div>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap gap-4 text-[12px] text-ink-3">
          <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-brand" /> Practical to operate</span>
          <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-sky" /> Motivation and transparency</span>
        </div>
      </div>
    </section>
  );
}

/* ---------- Audiences ---------- */
const AUDIENCES = [
  { icon: Users, who: 'For residents', text: 'RefillGo provides a convenient way to recycle PET bottles and aluminium cans while receiving practical rewards and information about recycling outcomes.' },
  { icon: Building2, who: 'For apartment managers', text: 'RefillGo supports cleaner shared areas and provides collection, participation and machine-status data through a management dashboard.' },
  { icon: Megaphone, who: 'For sponsoring brands', text: 'RefillGo provides a visible community recycling channel and measurable participation data for environmental campaigns.' },
];
export function Audiences() {
  return (
    <section id="who" className="mx-auto max-w-6xl px-5 py-20">
      <SectionHead eyebrow="Value proposition" title="Not simply another RVM — an integrated recycling and refill ecosystem designed specifically for apartment communities." />
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {AUDIENCES.map(({ icon: Icon, who, text }, i) => (
          <motion.div key={who} {...reveal} transition={{ ...reveal.transition, delay: i * 0.08 }} whileHover={{ y: -6 }} className="card p-6">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand-deep"><Icon size={24} /></span>
            <div className="mt-4 text-[12px] font-bold uppercase tracking-wider text-brand">{who}</div>
            <p className="mt-2 text-[15px] leading-relaxed">{text}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ---------- Journey timeline ---------- */
const JOURNEY = [
  { icon: MapPin, t: 'Deposited at the station', s: 'Compacted to a fraction of its volume' },
  { icon: Truck, t: 'Collected by the partner', s: 'The machine notifies the collection partner' },
  { icon: Factory, t: 'Sorted and baled', s: 'PET and aluminium processed separately' },
  { icon: Recycle, t: 'Recycled into new material', s: 'Every pick-up is logged' },
];
export function JourneyTimeline() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-6xl px-5">
        <SectionHead eyebrow="Traceability" title="Every pick-up is logged, so building management can always see what was collected and where it went." />
        <div ref={ref} className="relative mt-12">
          <div className="absolute left-6 top-6 hidden h-1 w-[calc(100%-3rem)] rounded-full bg-line md:block">
            <motion.div className="h-full rounded-full bg-brand" initial={{ scaleX: 0 }} animate={{ scaleX: inView ? 1 : 0 }} transition={{ duration: 1.4, ease: 'easeInOut' }} style={{ transformOrigin: 'left' }} />
          </div>
          <div className="grid gap-6 md:grid-cols-4">
            {JOURNEY.map(({ icon: Icon, t, s }, i) => (
              <motion.div key={t} initial={{ opacity: 0, y: 16 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.25 + i * 0.3 }} className="relative">
                <span className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full bg-brand text-white shadow-brand ring-4 ring-white"><Icon size={22} /></span>
                <div className="mt-4 text-[16px] font-bold">{t}</div>
                <div className="mt-1 text-[13.5px] text-ink-2">{s}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Rewards carousel ---------- */
const REWARDS = [
  { emoji: '🫧', title: 'Dishwash refill 500 ml', pts: 500, note: 'Bring your own bottle' },
  { emoji: '🧴', title: 'Shampoo refill 400 ml', pts: 700, note: 'Station shelf pick-up' },
  { emoji: '🧺', title: 'Laundry refill 1 L', pts: 1000, note: 'Bring your own bottle' },
  { emoji: '🎟', title: 'Grocery voucher 20,000 đ', pts: 800, note: 'Partner mini-mart' },
  { emoji: '☕', title: 'Lobby café espresso', pts: 600, note: 'Sunrise Tower café' },
];
export function RewardsCarousel() {
  const track = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const m = () => setW(el.scrollWidth - el.offsetWidth);
    m();
    window.addEventListener('resize', m);
    return () => window.removeEventListener('resize', m);
  }, []);
  return (
    <section id="rewards" className="overflow-hidden py-20">
      <div className="mx-auto max-w-6xl px-5">
        <SectionHead eyebrow="Rewards" title="Points can be redeemed for refill products such as detergent and shampoo, or for partner vouchers." sub="Drag to browse · 1 Green Point ≈ 25 đ refill value (demo conversion)." />
      </div>
      <div className="mx-auto mt-10 max-w-6xl px-5">
        <motion.div ref={track} drag="x" dragConstraints={{ left: -w, right: 0 }} className="flex cursor-grab gap-4 active:cursor-grabbing">
          {REWARDS.map((r, i) => (
            <motion.div key={r.title} {...reveal} transition={{ ...reveal.transition, delay: i * 0.05 }} whileHover={{ y: -6, rotate: -1 }} className="card w-[230px] shrink-0 select-none p-5 text-center">
              <div className="flex h-24 items-center justify-center rounded-2xl bg-brand-soft text-6xl">{r.emoji}</div>
              <div className="mt-4 text-[15px] font-bold leading-snug">{r.title}</div>
              <div className="mt-0.5 text-[12px] text-ink-3">{r.note}</div>
              <div className="tnum mt-2 inline-block rounded-full bg-page px-3 py-1 text-[13px] font-extrabold text-brand">{r.pts.toLocaleString('en-US')} pts</div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ---------- Pilot band ---------- */
export function PilotBand() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <section id="pilot" ref={ref} className="brand-gradient text-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-20 md:grid-cols-[1.2fr_1fr] md:items-center">
        <SectionHead light eyebrow="Minimum viable product · pilot" title="A three-month pilot involving five rented collection machines installed across five apartment buildings in Ho Chi Minh City." sub="The pilot will measure resident participation, repeat usage, reward redemption, collection volumes and basic machine reliability. Two collection and transportation staff will service all locations periodically; permanent on-site staff will not be required." />
        <div className="grid grid-cols-2 gap-4">
          {[[5, 'rented machines'], [5, 'apartment buildings'], [3, 'months'], [2, 'collection staff']].map(([n, l], i) => (
            <motion.div key={l as string} initial={{ opacity: 0, scale: 0.92 }} animate={inView ? { opacity: 1, scale: 1 } : {}} transition={{ delay: i * 0.1 }} className="rounded-3xl bg-white/15 p-5">
              <div className="tnum text-[44px] font-extrabold leading-none"><CountUp value={inView ? (n as number) : 0} duration={900} /></div>
              <div className="mt-1 text-[14px] text-white/85">{l as string}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- CTA + footer ---------- */
export function CtaFooter({ appLink, cta, qrValue }: { appLink: string; cta: string; qrValue: string }) {
  const nav = useNavigate();
  return (
    <>
      <section className="mx-auto max-w-6xl px-5 pb-20">
        <motion.div {...reveal} className="card grid items-center gap-6 p-8 md:grid-cols-[auto_1fr_auto]">
          <div className="hidden rounded-2xl bg-white p-3 shadow-card md:block"><QRCodeSVG value={qrValue} size={116} level="M" fgColor="#10241A" /></div>
          <div>
            <div className="text-[24px] font-extrabold leading-tight">Deposit bottles and cans. Earn Green Points.</div>
            <div className="mt-1.5 text-[14px] text-ink-2">Sign in with your phone number, scan the station QR and start earning. Station code <b className="tracking-wider text-ink">SG-SUN-01</b>.</div>
          </div>
          <button type="button" onClick={() => nav(appLink)} className="press inline-flex items-center justify-center gap-2 rounded-2xl brand-gradient px-6 py-3.5 text-[16px] font-bold text-white shadow-brand">
            {cta} <ArrowRight size={18} />
          </button>
        </motion.div>
      </section>
      <footer className="border-t border-line/70 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-8 text-[12px] text-ink-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2 font-semibold text-ink-2"><Leaf size={14} className="text-brand" /> RefillGo Station · Green Points</div>
            <div>BUSM3299 The Foundations of Entrepreneurship · RMIT Vietnam · Demo — points and rewards are for demonstration purposes.</div>
          </div>
          <div className="mt-3 flex items-start gap-2 text-[11px] leading-relaxed"><Package size={12} className="mt-0.5 shrink-0" /> Photos: Grendelkhan, Asurnipal, PattayaPatrol, Xuanphuocle (Wikimedia Commons, CC BY-SA 4.0); Ruth Hartnup (CC BY 2.0) · Video: SHVETS production via Pexels.</div>
        </div>
      </footer>
    </>
  );
}
