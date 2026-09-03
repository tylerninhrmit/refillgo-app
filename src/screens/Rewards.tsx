import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Leaf } from 'lucide-react';
import { api, type Reward } from '../lib/api';
import { useStore } from '../lib/store';
import { toVnd } from '../lib/points';
import { formatInt, formatVnd } from '../lib/format';
import { Card, Page, Spinner, TopBar } from '../components/ui';
import { CountUp } from '../components/CountUp';

const CATS: { id: 'all' | Reward['category']; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'refill', label: 'Refills' },
  { id: 'voucher', label: 'Vouchers' },
  { id: 'cafe', label: 'Café' },
];

export function Rewards() {
  const nav = useNavigate();
  const balance = useStore((s) => s.balance);
  const [rewards, setRewards] = useState<Reward[] | null>(null);
  const [cat, setCat] = useState<(typeof CATS)[number]['id']>('all');

  useEffect(() => {
    api.listRewards().then(setRewards).catch(() => setRewards([]));
  }, []);

  const list = rewards?.filter((r) => cat === 'all' || r.category === cat) ?? null;

  return (
    <Page>
      <TopBar title="Rewards" />
      <div className="px-4">
        <div className="card flex items-center gap-3 p-4">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-soft text-brand-deep"><Leaf size={22} /></span>
          <div className="flex-1">
            <div className="text-[12px] font-semibold text-ink-3">Available to spend</div>
            <div className="flex items-end gap-1.5"><CountUp value={balance} className="text-[24px] font-extrabold leading-none" /><span className="pb-0.5 text-[12px] font-semibold text-ink-3">pts ≈ {formatVnd(toVnd(balance))}</span></div>
          </div>
        </div>

        <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1">
          {CATS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCat(c.id)}
              className={`press shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold ${cat === c.id ? 'bg-ink text-white' : 'bg-white text-ink-2 border border-line'}`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {list === null && <Spinner />}
        <div className="mt-3 space-y-3">
          {list?.map((r) => {
            const ok = balance >= r.cost_points;
            return (
              <Card key={r.id} onClick={() => nav(`/rewards/${r.id}`)} className="flex items-center gap-3 p-3.5">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-page text-3xl">{r.emoji}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-bold">{r.title}</div>
                  <div className="truncate text-[12.5px] text-ink-3">{r.note}</div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className={`tnum text-[13.5px] font-extrabold ${ok ? 'text-brand' : 'text-ink-3'}`}>{formatInt(r.cost_points)} pts</span>
                    {r.vnd_value && <span className="text-[11.5px] text-ink-3">≈ {formatVnd(r.vnd_value)}</span>}
                    {!ok && <span className="rounded-full bg-page px-2 py-0.5 text-[10.5px] font-semibold text-ink-3">{formatInt(r.cost_points - balance)} more</span>}
                  </div>
                </div>
                <ChevronRight size={18} className="text-ink-3" />
              </Card>
            );
          })}
        </div>
        <div className="px-2 pb-2 pt-5 text-center text-[11px] text-ink-3">1 Green Point ≈ 25 đ refill value (demo conversion).</div>
      </div>
    </Page>
  );
}
