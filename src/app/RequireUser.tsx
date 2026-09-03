import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useStore } from '../lib/store';

export function RequireUser() {
  const user = useStore((s) => s.user);
  const loc = useLocation();
  if (!user) {
    const next = encodeURIComponent(loc.pathname + loc.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  return <Outlet />;
}
