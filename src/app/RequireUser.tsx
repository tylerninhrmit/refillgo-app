import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useStore } from '../lib/store';

export function RequireUser() {
  const user = useStore((s) => s.user);
  const loc = useLocation();
  if (!user) {
    if (loc.pathname === '/') return <Navigate to="/welcome" replace />; // visitors land on the public page
    const next = encodeURIComponent(loc.pathname + loc.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  return <Outlet />;
}
