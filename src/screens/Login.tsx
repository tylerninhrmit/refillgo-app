import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Leaf, Phone, User, ShieldCheck } from 'lucide-react';
import { api } from '../lib/api';
import { useStore } from '../lib/store';
import { Button } from '../components/ui';
import { useToast } from '../components/Toast';
import { normalizePhone } from '../lib/format';

export function Login() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const setUser = useStore((s) => s.setUser);
  const toast = useToast();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const digits = normalizePhone(phone);
    if (digits.length < 9) return toast('Please enter a valid phone number.', 'err');
    setBusy(true);
    try {
      const profile = await api.loginWithPhone(digits, name);
      setUser(profile);
      nav(params.get('next') || '/', { replace: true });
    } catch (err) {
      toast((err as Error).message, 'err');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col">
      <div className="brand-gradient relative overflow-hidden px-6 pb-16 pt-16 text-white safe-t">
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -left-10 bottom-0 h-40 w-40 rounded-full bg-lime/15" />
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 ring-1 ring-white/30">
            <Leaf size={30} />
          </div>
          <h1 className="mt-5 text-[28px] font-extrabold leading-tight">
            RefillGo <span className="font-medium text-white/80">Green Points</span>
          </h1>
          <p className="mt-2 text-[15px] text-white/85">
            Deposit PET bottles and aluminium cans in your lobby. Earn Green Points. Redeem refills and vouchers.
          </p>
        </motion.div>
      </div>

      <motion.form
        onSubmit={submit}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="card relative z-10 -mt-8 mx-4 space-y-4 p-5"
      >
        <div>
          <label className="text-[12px] font-semibold text-ink-3">Your name</label>
          <div className="mt-1 flex items-center gap-2 rounded-2xl border border-line bg-page px-3">
            <User size={18} className="text-ink-3" />
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Dat Ninh"
              autoComplete="name"
              className="h-12 w-full bg-transparent text-[15px] outline-none"
            />
          </div>
        </div>
        <div>
          <label className="text-[12px] font-semibold text-ink-3">Phone number</label>
          <div className="mt-1 flex items-center gap-2 rounded-2xl border border-line bg-page px-3">
            <Phone size={18} className="text-ink-3" />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="09xx xxx xxx"
              inputMode="tel"
              autoComplete="tel"
              required
              className="h-12 w-full bg-transparent text-[15px] outline-none tnum"
            />
          </div>
        </div>
        <Button type="submit" disabled={busy}>
          {busy ? 'Signing in…' : 'Continue'}
        </Button>
        <p className="flex items-start gap-2 text-[12px] leading-snug text-ink-3">
          <ShieldCheck size={16} className="mt-0.5 shrink-0 text-brand" />
          Demo sign-in: no OTP is sent and your account is created automatically. Points are for demonstration only.
        </p>
      </motion.form>

      <div className="mt-auto px-6 py-6 text-center text-[11.5px] text-ink-3">
        Sunrise Tower · Station SG-SUN-01 · Lobby A
      </div>
    </div>
  );
}
