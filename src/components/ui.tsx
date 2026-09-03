import type { ReactNode, ButtonHTMLAttributes } from 'react';
import { motion } from 'framer-motion';
import { initials } from '../lib/format';

export function Card({ children, className = '', onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  const Comp = onClick ? 'button' : 'div';
  return (
    <Comp onClick={onClick} className={`card ${onClick ? 'press w-full text-left' : ''} ${className}`}>
      {children}
    </Comp>
  );
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
export function Button({
  variant = 'primary',
  className = '',
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const base = 'press inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl px-5 text-[15px] font-semibold transition disabled:opacity-50 disabled:active:scale-100';
  const styles: Record<Variant, string> = {
    primary: 'brand-gradient text-white shadow-brand',
    secondary: 'bg-brand-soft text-brand-deep',
    ghost: 'bg-transparent text-ink-2 border border-line',
    danger: 'bg-coral/10 text-coral',
  };
  return (
    <button className={`${base} ${styles[variant]} ${className}`} {...rest}>
      {children}
    </button>
  );
}

export function Chip({ children, tone = 'soft', className = '' }: { children: ReactNode; tone?: 'soft' | 'white' | 'dark'; className?: string }) {
  const t = tone === 'soft' ? 'bg-brand-soft text-brand-deep' : tone === 'white' ? 'bg-white/20 text-white' : 'bg-ink text-white';
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${t} ${className}`}>{children}</span>;
}

export function Avatar({ name, size = 44, light = false }: { name: string; size?: number; light?: boolean }) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-bold ${light ? 'bg-white/25 text-white ring-2 ring-white/40' : 'bg-brand-soft text-brand-deep'}`}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      aria-hidden
    >
      {initials(name) || 'R'}
    </div>
  );
}

export function IconTile({
  icon,
  label,
  color = 'brand',
  onClick,
}: {
  icon: ReactNode;
  label: string;
  color?: 'brand' | 'sky' | 'amber' | 'coral' | 'violet' | 'teal';
  onClick?: () => void;
}) {
  const bg: Record<string, string> = {
    brand: 'bg-brand-soft text-brand-deep',
    sky: 'bg-sky/12 text-sky',
    amber: 'bg-amber/15 text-amber',
    coral: 'bg-coral/12 text-coral',
    violet: 'bg-violet/12 text-violet',
    teal: 'bg-teal/12 text-teal',
  };
  return (
    <button type="button" onClick={onClick} className="press flex flex-col items-center gap-1.5 py-1">
      <span className={`flex h-14 w-14 items-center justify-center rounded-2xl ${bg[color]}`}>{icon}</span>
      <span className="text-center text-[11.5px] font-medium leading-tight text-ink-2">{label}</span>
    </button>
  );
}

export function SectionTitle({ children, action, onAction }: { children: ReactNode; action?: string; onAction?: () => void }) {
  return (
    <div className="mb-2.5 flex items-center justify-between px-1">
      <h2 className="text-[15px] font-bold text-ink">{children}</h2>
      {action && (
        <button type="button" onClick={onAction} className="text-[12.5px] font-semibold text-brand">
          {action}
        </button>
      )}
    </div>
  );
}

export function ProgressBar({ value, tone = 'brand', className = '' }: { value: number; tone?: 'brand' | 'amber' | 'coral'; className?: string }) {
  const v = Math.max(0, Math.min(100, value));
  const color = tone === 'brand' ? 'bg-brand' : tone === 'amber' ? 'bg-amber' : 'bg-coral';
  return (
    <div className={`h-2.5 w-full overflow-hidden rounded-full bg-line ${className}`}>
      <motion.div
        className={`h-full rounded-full ${color}`}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: v / 100 }}
        transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        style={{ transformOrigin: 'left' }}
      />
    </div>
  );
}

export function Spinner({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center py-10 ${className}`} role="status" aria-label="Loading">
      <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-line border-t-brand" />
    </div>
  );
}

export function EmptyState({ emoji, title, body }: { emoji: string; title: string; body?: string }) {
  return (
    <div className="card flex flex-col items-center px-6 py-10 text-center">
      <div className="text-4xl">{emoji}</div>
      <div className="mt-3 text-[15px] font-bold">{title}</div>
      {body && <div className="mt-1 text-[13px] text-ink-3">{body}</div>}
    </div>
  );
}

export function TopBar({ title, onBack, right }: { title: string; onBack?: () => void; right?: ReactNode }) {
  return (
    <div className="sticky top-0 z-30 flex h-14 items-center gap-2 bg-page/90 px-2 backdrop-blur safe-t">
      {onBack ? (
        <button type="button" onClick={onBack} aria-label="Back" className="press flex h-10 w-10 items-center justify-center rounded-full">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      ) : (
        <div className="w-2" />
      )}
      <h1 className="flex-1 text-[17px] font-bold">{title}</h1>
      {right}
    </div>
  );
}

export function Page({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className={`mx-auto w-full max-w-[480px] ${className}`}
    >
      {children}
    </motion.div>
  );
}
