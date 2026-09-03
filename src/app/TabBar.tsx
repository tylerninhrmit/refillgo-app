import { NavLink, useNavigate } from 'react-router-dom';
import { Home, Gift, ScanLine, Clock, User } from 'lucide-react';

const tabs = [
  { to: '/', label: 'Home', Icon: Home },
  { to: '/rewards', label: 'Rewards', Icon: Gift },
  { to: '/history', label: 'Activity', Icon: Clock },
  { to: '/me', label: 'Me', Icon: User },
];

export function TabBar() {
  const nav = useNavigate();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-[480px] border-t border-line bg-white/95 backdrop-blur safe-b"
      aria-label="Main"
    >
      <div className="relative grid h-16 grid-cols-5 items-end">
        {tabs.slice(0, 2).map((t) => (
          <Tab key={t.to} {...t} />
        ))}
        <div className="relative flex justify-center">
          <button
            type="button"
            onClick={() => nav('/scan')}
            aria-label="Scan station QR"
            className="press absolute bottom-[26px] flex h-16 w-16 items-center justify-center rounded-full brand-gradient text-white shadow-brand ring-4 ring-white"
          >
            <ScanLine size={28} strokeWidth={2.2} />
          </button>
          <span className="pb-1.5 text-[10.5px] font-semibold text-brand">Scan</span>
        </div>
        {tabs.slice(2).map((t) => (
          <Tab key={t.to} {...t} />
        ))}
      </div>
    </nav>
  );
}

function Tab({ to, label, Icon }: { to: string; label: string; Icon: typeof Home }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        `flex h-full flex-col items-center justify-center gap-1 pb-1 text-[10.5px] font-semibold ${
          isActive ? 'text-brand' : 'text-ink-3'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon size={22} strokeWidth={isActive ? 2.4 : 2} />
          {label}
        </>
      )}
    </NavLink>
  );
}
