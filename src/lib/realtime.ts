import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { api, type Deposit, type Session } from './api';

const POLL_MS = 2500;
const RECONCILE_MS = 10000;

/** Live view of one deposit session (phone side). Realtime is a wake-up signal; polling + reconcile keep it honest. */
export function useLiveSession(sessionId: string | undefined) {
  const [session, setSession] = useState<Session | null>(null);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [live, setLive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const liveRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!sessionId) return;
    try {
      const [s, d] = await Promise.all([api.getSession(sessionId), api.listDeposits(sessionId)]);
      if (s) setSession(s);
      setDeposits(d);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    let channel: RealtimeChannel | null = null;
    let stopped = false;
    let backoff = 1000;

    const subscribe = () => {
      if (stopped) return;
      channel = supabase
        .channel(`session:${sessionId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'deposits', filter: `session_id=eq.${sessionId}` },
          (payload) => {
            const d = payload.new as Deposit;
            setDeposits((prev) => (prev.some((x) => x.id === d.id) ? prev : [...prev, d]));
          },
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'sessions', filter: `id=eq.${sessionId}` },
          (payload) => setSession(payload.new as Session),
        )
        .subscribe((status) => {
          const ok = status === 'SUBSCRIBED';
          liveRef.current = ok;
          setLive(ok);
          if (ok) backoff = 1000;
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            const ch = channel;
            channel = null;
            if (ch) supabase.removeChannel(ch);
            window.setTimeout(subscribe, backoff);
            backoff = Math.min(backoff * 2, 10000);
          }
        });
    };

    void refresh();
    subscribe();
    const poll = window.setInterval(() => {
      if (!liveRef.current) void refresh();
    }, POLL_MS);
    const reconcile = window.setInterval(() => void refresh(), RECONCILE_MS);
    const onVis = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      stopped = true;
      window.clearInterval(poll);
      window.clearInterval(reconcile);
      document.removeEventListener('visibilitychange', onVis);
      if (channel) supabase.removeChannel(channel);
    };
  }, [sessionId, refresh]);

  return { session, deposits, live, error, refresh };
}

/** Live view of one machine (kiosk side): the active session and the latest deposits. */
export function useMachineFeed(machineId: string | undefined) {
  const [active, setActive] = useState<Session | null>(null);
  const [lastDeposit, setLastDeposit] = useState<Deposit | null>(null);
  const [live, setLive] = useState(false);
  const liveRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!machineId) return;
    try {
      const s = await api.getActiveSession(machineId);
      setActive(s);
    } catch {
      /* keep last known state */
    }
  }, [machineId]);

  useEffect(() => {
    if (!machineId) return;
    let channel: RealtimeChannel | null = null;
    let stopped = false;
    let backoff = 1000;
    const subscribe = () => {
      if (stopped) return;
      channel = supabase
        .channel(`machine:${machineId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'sessions', filter: `machine_id=eq.${machineId}` },
          (payload) => {
            const s = payload.new as Session;
            if (s.status === 'active') setActive(s);
            else setActive((prev) => (prev && prev.id === s.id ? null : prev));
          },
        )
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'deposits', filter: `machine_id=eq.${machineId}` },
          (payload) => setLastDeposit(payload.new as Deposit),
        )
        .subscribe((status) => {
          const ok = status === 'SUBSCRIBED';
          liveRef.current = ok;
          setLive(ok);
          if (ok) backoff = 1000;
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            const ch = channel;
            channel = null;
            if (ch) supabase.removeChannel(ch);
            window.setTimeout(subscribe, backoff);
            backoff = Math.min(backoff * 2, 10000);
          }
        });
    };
    void refresh();
    subscribe();
    const poll = window.setInterval(() => {
      if (!liveRef.current) void refresh();
    }, POLL_MS);
    const reconcile = window.setInterval(() => void refresh(), RECONCILE_MS);
    return () => {
      stopped = true;
      window.clearInterval(poll);
      window.clearInterval(reconcile);
      if (channel) supabase.removeChannel(channel);
    };
  }, [machineId, refresh]);

  return { active, setActive, lastDeposit, live, refresh };
}
