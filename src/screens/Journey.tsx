import { useEffect, useState } from 'react';
import { Truck, Factory, Recycle, MapPin, CalendarClock, BadgeCheck } from 'lucide-react';
import { api, type Journey as JourneyData } from '../lib/api';
import { useStore } from '../lib/store';
import { formatDate, formatInt } from '../lib/format';
import { Card, Chip, Page, ProgressBar, Spinner, TopBar } from '../components/ui';

export function Journey() {
  const user = useStore((s) => s.user);
  const [data, setData] = useState<JourneyData | null | undefined>(undefined);

  useEffect(() => {
    if (!user) return;
    api.getJourney(user.id).then((j) => setData(j.status === 'ok' ? j : null)).catch(() => setData(null));
  }, [user]);

  if (data === undefined) return <Page><TopBar title="Where it goes" /><Spinner /></Page>;
  if (!data) return <Page><TopBar title="Where it goes" /><div className="p-6 text-center text-ink-3">Could not load journey.</div></Page>;

  const m = data.machine;
  const next = data.next_pickup;
  const fillTone = m.fill_level >= 80 ? 'coral' : m.fill_level >= 60 ? 'amber' : 'brand';

  const steps = [
    { icon: <MapPin size={18} />, title: `Deposited at ${m.id}`, body: `${m.building} · ${m.name}`, state: 'done' as const },
    { icon: <Truck size={18} />, title: `Collected by ${data.partner}`, body: next ? `Next pick-up ${new Date(next.picked_at).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} · 07:30` : 'Scheduled when the bin nears capacity', state: 'next' as const },
    { icon: <Factory size={18} />, title: 'Sorted & baled', body: 'PET and aluminium processed separately', state: 'todo' as const },
    { icon: <Recycle size={18} />, title: 'Recycled into new material', body: 'Impact reported back to your building', state: 'todo' as const },
  ];

  return (
    <Page>
      <TopBar title="Where it goes" />
      <div className="space-y-4 px-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[12px] font-semibold text-ink-3">Station</div>
              <div className="text-[16px] font-extrabold">{m.id} · {m.name}</div>
              <div className="text-[12.5px] text-ink-3">{m.building}{m.location ? ` · ${m.location}` : ''}</div>
            </div>
            <Chip>{m.status === 'online' ? 'Online' : m.status}</Chip>
          </div>
          <div className="mt-4 flex items-center justify-between text-[12.5px]">
            <span className="font-semibold text-ink-2">Bin fill level</span>
            <span className="tnum font-bold">{m.fill_level}%</span>
          </div>
          <ProgressBar value={m.fill_level} tone={fillTone} className="mt-1.5" />
          <div className="mt-1.5 text-[11.5px] text-ink-3">Compacted volume · collection partner is notified at 80%</div>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4">
            <div className="text-[12px] text-ink-3">Your containers in this batch</div>
            <div className="tnum text-[26px] font-extrabold text-brand">{formatInt(data.my_containers_in_batch)}</div>
            <div className="text-[11.5px] text-ink-3">since last pick-up</div>
          </Card>
          <Card className="p-4">
            <div className="text-[12px] text-ink-3">Building this month</div>
            <div className="tnum text-[26px] font-extrabold">{formatInt(data.building_month_total)}</div>
            <div className="text-[11.5px] text-ink-3">containers collected</div>
          </Card>
        </div>

        <Card className="p-4">
          <div className="mb-3 text-[14px] font-bold">Journey of your containers</div>
          <ol className="relative space-y-4 pl-1">
            {steps.map((s, i) => (
              <li key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className={`flex h-9 w-9 items-center justify-center rounded-full ${s.state === 'done' ? 'bg-brand text-white' : s.state === 'next' ? 'bg-brand-soft text-brand-deep ring-2 ring-brand/40' : 'bg-page text-ink-3'}`}>{s.icon}</span>
                  {i < steps.length - 1 && <span className={`mt-1 w-0.5 flex-1 ${s.state === 'done' ? 'bg-brand' : 'bg-line'}`} style={{ minHeight: 18 }} />}
                </div>
                <div className="pb-1">
                  <div className={`text-[14px] font-semibold ${s.state === 'todo' ? 'text-ink-3' : ''}`}>{s.title}</div>
                  <div className="text-[12.5px] text-ink-3">{s.body}</div>
                </div>
              </li>
            ))}
          </ol>
        </Card>

        <Card className="divide-y divide-line">
          <div className="flex items-center gap-2 px-4 py-3 text-[14px] font-bold"><CalendarClock size={16} className="text-brand" /> Pick-up log</div>
          {data.pickups.map((p) => (
            <div key={p.id} className="flex items-center gap-3 px-4 py-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-soft text-brand-deep"><BadgeCheck size={16} /></span>
              <div className="flex-1">
                <div className="text-[13.5px] font-semibold">{formatDate(p.picked_at)} · {p.weight_kg ?? '—'} kg</div>
                <div className="text-[12px] text-ink-3">{p.partner} · batch {p.batch_code}</div>
              </div>
              <Chip>{p.status}</Chip>
            </div>
          ))}
          {next && (
            <div className="flex items-center gap-3 px-4 py-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber/15 text-amber"><Truck size={16} /></span>
              <div className="flex-1">
                <div className="text-[13.5px] font-semibold">{formatDate(next.picked_at)} · 07:30</div>
                <div className="text-[12px] text-ink-3">{next.partner} · batch {next.batch_code}</div>
              </div>
              <Chip className="bg-amber/15 text-amber">scheduled</Chip>
            </div>
          )}
        </Card>
        <div className="pb-2 text-center text-[11px] text-ink-3">Traceability data shown for the pilot station (demo partner).</div>
      </div>
    </Page>
  );
}
