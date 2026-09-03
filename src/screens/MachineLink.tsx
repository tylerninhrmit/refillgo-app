import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useStore } from '../lib/store';
import { Button, Page, Spinner } from '../components/ui';

/** Deep link printed on the machine QR: /m/SG-SUN-01 → starts a session for the signed-in resident. */
export function MachineLink() {
  const { machineId } = useParams();
  const nav = useNavigate();
  const { user, setSession, setBalance } = useStore();
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!user || !machineId) return;
    let alive = true;
    setError(null);
    api
      .startSession(user.id, machineId.toUpperCase())
      .then((res) => {
        if (!alive) return;
        if (res.status === 'ok' && res.session) {
          setSession(res.session);
          if (typeof res.balance === 'number') setBalance(res.balance);
          nav(`/session/${res.session.id}`, { replace: true });
        } else setError(res.message || (res.status === 'no_machine' ? `Station ${machineId} not found.` : 'Could not start a session.'));
      })
      .catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [user, machineId, tick, nav, setSession, setBalance]);

  return (
    <Page className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      {!error ? (
        <>
          <Spinner />
          <div className="text-[15px] font-semibold">Connecting to {machineId?.toUpperCase()}…</div>
        </>
      ) : (
        <div className="card w-full p-5">
          <div className="text-3xl">⏳</div>
          <div className="mt-2 text-[16px] font-bold">Station busy</div>
          <div className="mt-1 text-[13px] text-ink-3">{error}</div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button variant="ghost" onClick={() => nav('/')}>Home</Button>
            <Button onClick={() => setTick((t) => t + 1)}>Try again</Button>
          </div>
        </div>
      )}
    </Page>
  );
}
