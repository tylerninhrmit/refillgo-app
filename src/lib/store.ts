import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Profile, Session } from './api';

interface AppState {
  user: Profile | null;
  balance: number;
  session: Session | null;
  hideBalance: boolean;
  pendingMachine: string | null;
  setUser: (u: Profile | null) => void;
  setBalance: (b: number) => void;
  setSession: (s: Session | null) => void;
  toggleHide: () => void;
  setPendingMachine: (m: string | null) => void;
  signOut: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      balance: 0,
      session: null,
      hideBalance: false,
      pendingMachine: null,
      setUser: (u) => set({ user: u, balance: u?.points ?? 0 }),
      setBalance: (b) => set((st) => ({ balance: b, user: st.user ? { ...st.user, points: b } : st.user })),
      setSession: (s) => set({ session: s }),
      toggleHide: () => set((st) => ({ hideBalance: !st.hideBalance })),
      setPendingMachine: (m) => set({ pendingMachine: m }),
      signOut: () => set({ user: null, balance: 0, session: null, pendingMachine: null }),
    }),
    {
      name: 'refillgo:v1',
      partialize: (st) => ({
        user: st.user,
        balance: st.balance,
        session: st.session,
        hideBalance: st.hideBalance,
        pendingMachine: st.pendingMachine,
      }),
    },
  ),
);
