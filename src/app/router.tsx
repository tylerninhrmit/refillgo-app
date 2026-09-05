import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { RequireUser } from './RequireUser';
import { TabLayout } from './TabLayout';
import { Login } from '../screens/Login';
import { Landing } from '../screens/Landing';
import { Home } from '../screens/Home';
import { Scan } from '../screens/Scan';
import { SessionScreen } from '../screens/Session';
import { Rewards } from '../screens/Rewards';
import { RewardDetail } from '../screens/RewardDetail';
import { History } from '../screens/History';
import { Journey } from '../screens/Journey';
import { Me } from '../screens/Me';
import { MachineLink } from '../screens/MachineLink';
const KioskPage = lazy(() => import('../kiosk/KioskPage').then((m) => ({ default: m.KioskPage })));

export const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  { path: '/welcome', element: <Landing /> },
  {
    path: '/kiosk/:machineId',
    element: (
      <Suspense fallback={<div className="flex h-dvh items-center justify-center text-xl text-ink-3">Loading kiosk…</div>}>
        <KioskPage />
      </Suspense>
    ),
  },
  {
    element: <RequireUser />,
    children: [
      {
        element: <TabLayout />,
        children: [
          { path: '/', element: <Home /> },
          { path: '/rewards', element: <Rewards /> },
          { path: '/history', element: <History /> },
          { path: '/journey', element: <Journey /> },
          { path: '/me', element: <Me /> },
        ],
      },
      { path: '/scan', element: <Scan /> },
      { path: '/session/:id', element: <SessionScreen /> },
      { path: '/rewards/:id', element: <RewardDetail /> },
      { path: '/m/:machineId', element: <MachineLink /> },
      { path: '/d/:machineId', element: <MachineLink /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
