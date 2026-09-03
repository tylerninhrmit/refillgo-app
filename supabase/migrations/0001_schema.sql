-- RefillGo Green Points — schema (demo-grade: no Supabase Auth, RPC-only writes)
create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  phone text not null unique,                      -- normalised: digits only, 84xxxxxxxxx -> 0xxxxxxxxx
  name text not null,
  building text not null default 'Sunrise Tower',
  points int not null default 0 check (points >= 0),
  created_at timestamptz not null default now()
);

create table public.machines (
  id text primary key,                             -- 'SG-SUN-01'
  name text not null,                              -- 'Lobby A'
  building text not null,
  location text,
  fill_count int not null default 0,
  capacity int not null default 400,
  fill_level int generated always as (least(100, (fill_count * 100) / greatest(capacity, 1))) stored,
  status text not null default 'online',
  machine_key text not null,                       -- shared secret; hidden from anon by column grant
  updated_at timestamptz not null default now()
);

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  machine_id text not null references public.machines(id),
  user_id uuid not null references public.profiles(id),
  display_name text,
  status text not null default 'active' check (status in ('active', 'ended')),
  pet_count int not null default 0,
  can_count int not null default 0,
  rejected_count int not null default 0,
  points int not null default 0,
  started_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now(),
  ended_at timestamptz
);
create unique index sessions_one_active_per_machine on public.sessions (machine_id) where status = 'active';
create index sessions_user_idx on public.sessions (user_id, started_at desc);

create table public.deposits (
  id bigint generated always as identity primary key,
  session_id uuid references public.sessions(id),  -- null = no active session at the time
  user_id uuid references public.profiles(id),
  machine_id text not null references public.machines(id),
  material text not null check (material in ('pet', 'can', 'rejected')),
  points int not null default 0,
  client_event_id uuid unique,                     -- idempotency key from the kiosk queue
  created_at timestamptz not null default now()
);
create index deposits_session_idx on public.deposits (session_id, created_at);
create index deposits_user_idx on public.deposits (user_id, created_at desc);
create index deposits_machine_idx on public.deposits (machine_id, created_at desc);

create table public.rewards (
  id text primary key,
  title text not null,
  category text not null check (category in ('refill', 'voucher', 'cafe')),
  cost_points int not null check (cost_points > 0),
  vnd_value int,
  note text,
  detail text,
  emoji text,
  sort int not null default 0,
  active boolean not null default true
);

create table public.redemptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  reward_id text not null references public.rewards(id),
  points int not null,
  code text not null unique,
  status text not null default 'issued',
  created_at timestamptz not null default now()
);
create index redemptions_user_idx on public.redemptions (user_id, created_at desc);

create table public.pickups (
  id bigint generated always as identity primary key,
  machine_id text not null references public.machines(id),
  partner text not null default 'GreenLoop Recycling (demo)',
  weight_kg numeric(6, 1),
  batch_code text,
  status text not null check (status in ('scheduled', 'collected', 'verified')),
  picked_at timestamptz not null
);
create index pickups_machine_idx on public.pickups (machine_id, picked_at desc);

-- Row level security: everything locked; read-only policies only where the UI / Realtime needs them
alter table public.profiles    enable row level security;   -- no policies: unreadable
alter table public.redemptions enable row level security;   -- no policies: unreadable
alter table public.machines    enable row level security;
alter table public.rewards     enable row level security;
alter table public.pickups     enable row level security;
alter table public.sessions    enable row level security;
alter table public.deposits    enable row level security;

create policy anon_read_machines on public.machines for select to anon, authenticated using (true);
create policy anon_read_rewards  on public.rewards  for select to anon, authenticated using (active);
create policy anon_read_pickups  on public.pickups  for select to anon, authenticated using (true);
create policy anon_read_sessions on public.sessions for select to anon, authenticated using (true);
create policy anon_read_deposits on public.deposits for select to anon, authenticated using (true);

-- machine_key never leaves the database
revoke select on public.machines from anon, authenticated;
grant select (id, name, building, location, fill_count, capacity, fill_level, status, updated_at)
  on public.machines to anon, authenticated;

-- Realtime
alter publication supabase_realtime add table public.deposits, public.sessions;
