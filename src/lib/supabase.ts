import { createClient } from '@supabase/supabase-js';

// The publishable (anon) key is safe to ship in the client: row-level security and SECURITY DEFINER RPCs
// are what protect the data. Defaults keep the app working even when the host has no env vars configured.
const DEFAULT_URL = 'https://bdbjgoqtilpfouqjegph.supabase.co';
const DEFAULT_KEY = 'sb_publishable_g8MQyeA6GPiqUd5VxlozkA_0bnltEi9';

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || DEFAULT_URL;
const key = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() || DEFAULT_KEY;

export const CONFIG_ERROR: string | null =
  !/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url) || key.length < 20
    ? 'Supabase configuration is invalid. Check VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.'
    : null;

export const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: {
    heartbeatIntervalMs: 15000,
    reconnectAfterMs: (tries: number) => Math.min(1000 * 2 ** tries, 10000),
  },
});

export const APP_URL: string =
  (import.meta.env.VITE_APP_URL as string | undefined)?.replace(/\/$/, '') ||
  (typeof window !== 'undefined' ? window.location.origin : '');
