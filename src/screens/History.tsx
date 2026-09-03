import { useEffect, useMemo, useState } from 'react';
import { api, type HistoryItem } from '../lib/api';
import { useStore } from '../lib/store';
import { formatDay, formatInt } from '../lib/format';
import { Card, EmptyState, Page, Spinner, TopBar } from '../components/ui';
import { ActivityRow } from './Home';

export function History() {
  const user = useStore((s) => s.user);
  const [items, setItems] = useState<HistoryItem[] | null>(null);

  useEffect(() => {
    if (user) api.getHistory(user.id).then(setItems).catch(() => setItems([]));
  }, [user]);

  const groups = useMemo(() => {
    const map = new Map<string, HistoryItem[]>();
    (items ?? []).forEach((it) => {
      const k = formatDay(it.at);
      map.set(k, [...(map.get(k) ?? []), it]);
    });
    return [...map.entries()];
  }, [items]);

  const earned = (items ?? []).filter((i) => i.points > 0).reduce((a, i) => a + i.points, 0);
  const spent = (items ?? []).filter((i) => i.points < 0).reduce((a, i) => a - i.points, 0);

  return (
    <Page>
      <TopBar title="Activity" />
      <div className="px-4">
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4"><div className="text-[12px] text-ink-3">Earned</div><div className="tnum text-[22px] font-extrabold text-brand">+{formatInt(earned)}</div></Card>
          <Card className="p-4"><div className="text-[12px] text-ink-3">Redeemed</div><div className="tnum text-[22px] font-extrabold text-ink">−{formatInt(spent)}</div></Card>
        </div>
        {items === null && <Spinner />}
        {items?.length === 0 && <div className="mt-4"><EmptyState emoji="🧾" title="No activity yet" body="Scan a station to make your first deposit." /></div>}
        {groups.map(([day, list]) => (
          <div key={day} className="mt-5">
            <div className="mb-2 px-1 text-[12.5px] font-bold text-ink-3">{day}</div>
            <Card className="divide-y divide-line">
              {list.map((it) => <ActivityRow key={it.id} item={it} />)}
            </Card>
          </div>
        ))}
      </div>
    </Page>
  );
}
