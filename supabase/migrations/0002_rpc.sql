-- RefillGo Green Points — RPCs (all writes go through these; SECURITY DEFINER)

create or replace function public.points_for(material text) returns int
language sql immutable as $$
  select case material when 'pet' then 10 when 'can' then 15 else 0 end
$$;

create or replace function public.normalize_phone(raw text) returns text
language plpgsql immutable as $$
declare d text;
begin
  d := regexp_replace(coalesce(raw, ''), '\D', '', 'g');
  if length(d) = 11 and left(d, 2) = '84' then d := '0' || substr(d, 3); end if;
  if length(d) < 9 or length(d) > 12 then raise exception 'invalid_phone' using errcode = '22023'; end if;
  return d;
end $$;

-- Sign-in without OTP (demo): returns the profile as json
create or replace function public.login_with_phone(phone text, name text) returns jsonb
language plpgsql security definer set search_path = public as $$
#variable_conflict use_variable
declare p profiles; ph text; nm text;
begin
  ph := normalize_phone(phone);
  nm := nullif(trim(coalesce(name, '')), '');
  insert into profiles (phone, name) values (ph, coalesce(nm, 'Resident'))
    on conflict on constraint profiles_phone_key do update set name = coalesce(nm, profiles.name)
    returning * into p;
  return to_jsonb(p);
end $$;

create or replace function public.start_session(user_id uuid, machine_id text) returns jsonb
language plpgsql security definer set search_path = public as $$
#variable_conflict use_variable
declare m machines; s sessions; other sessions; p profiles;
begin
  select * into p from profiles pp where pp.id = user_id;
  if not found then return jsonb_build_object('status', 'no_user'); end if;
  select * into m from machines mm where mm.id = machine_id for update;   -- serialises starts per machine
  if not found then return jsonb_build_object('status', 'no_machine'); end if;
  -- auto-end the caller's own active sessions (any machine)
  update sessions ss set status = 'ended', ended_at = now() where ss.user_id = user_id and ss.status = 'active';
  select * into other from sessions ss where ss.machine_id = machine_id and ss.status = 'active';
  if found then
    if other.last_activity_at < now() - interval '3 minutes' then
      update sessions ss set status = 'ended', ended_at = now() where ss.id = other.id;   -- stale: take over
    else
      return jsonb_build_object('status', 'busy',
        'message', 'Another resident is using this station. Try again in a moment.');
    end if;
  end if;
  insert into sessions (machine_id, user_id, display_name) values (machine_id, user_id, p.name) returning * into s;
  return jsonb_build_object('status', 'ok', 'session', to_jsonb(s), 'balance', p.points,
    'machine', jsonb_build_object('id', m.id, 'name', m.name, 'building', m.building, 'fill_level', m.fill_level));
exception when unique_violation then
  return jsonb_build_object('status', 'busy', 'message', 'Station busy, please retry.');
end $$;

create or replace function public.end_session(session_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
#variable_conflict use_variable
declare s sessions; bal int;
begin
  update sessions ss set status = 'ended', ended_at = coalesce(ss.ended_at, now())
    where ss.id = session_id returning * into s;
  if not found then return jsonb_build_object('status', 'no_session'); end if;
  select pp.points into bal from profiles pp where pp.id = s.user_id;
  return jsonb_build_object('status', 'ok', 'session', to_jsonb(s), 'balance', bal);
end $$;

-- Called by the kiosk (YOLO detector / operator overlay). Idempotent on client_event_id.
create or replace function public.record_deposit(machine_id text, machine_key text, material text,
                                                 client_event_id uuid default null) returns jsonb
language plpgsql security definer set search_path = public as $$
#variable_conflict use_variable
declare m machines; s sessions; d deposits; pts int; bal int; last_at timestamptz;
begin
  if material not in ('pet', 'can', 'rejected') then return jsonb_build_object('status', 'bad_material'); end if;
  select * into m from machines mm where mm.id = machine_id for update;   -- one deposit at a time per machine
  if not found or m.machine_key is distinct from machine_key then
    return jsonb_build_object('status', 'unauthorized');
  end if;
  if client_event_id is not null then
    select * into d from deposits dd where dd.client_event_id = client_event_id;
    if found then
      select * into s from sessions ss where ss.id = d.session_id;
      select pp.points into bal from profiles pp where pp.id = d.user_id;
      return jsonb_build_object('status', 'duplicate', 'points_added', d.points,
        'session', to_jsonb(s), 'balance', bal, 'deposit_id', d.id);
    end if;
  end if;
  pts := points_for(material);
  select * into s from sessions ss where ss.machine_id = machine_id and ss.status = 'active' for update;
  if found then
    select max(dd.created_at) into last_at from deposits dd where dd.session_id = s.id;
    if last_at is not null and last_at > clock_timestamp() - interval '900 milliseconds' then
      select pp.points into bal from profiles pp where pp.id = s.user_id;
      return jsonb_build_object('status', 'too_fast', 'session', to_jsonb(s), 'balance', bal);
    end if;
  end if;
  insert into deposits (session_id, user_id, machine_id, material, points, client_event_id, created_at)
    values (s.id, s.user_id, machine_id, material, case when s.id is null then 0 else pts end, client_event_id, clock_timestamp())
    returning * into d;
  if material <> 'rejected' then
    update machines mm set fill_count = mm.fill_count + 1, updated_at = now() where mm.id = machine_id;
  end if;
  if s.id is null then return jsonb_build_object('status', 'no_session', 'deposit_id', d.id); end if;
  update sessions ss set
      pet_count = ss.pet_count + (material = 'pet')::int,
      can_count = ss.can_count + (material = 'can')::int,
      rejected_count = ss.rejected_count + (material = 'rejected')::int,
      points = ss.points + pts,
      last_activity_at = clock_timestamp()
    where ss.id = s.id returning * into s;
  if pts > 0 then
    update profiles pp set points = pp.points + pts where pp.id = s.user_id returning pp.points into bal;
  else
    select pp.points into bal from profiles pp where pp.id = s.user_id;
  end if;
  return jsonb_build_object('status', case when material = 'rejected' then 'rejected' else 'ok' end,
    'points_added', pts, 'session', to_jsonb(s), 'balance', bal, 'deposit_id', d.id);
end $$;

create or replace function public.redeem_reward(user_id uuid, reward_id text) returns jsonb
language plpgsql security definer set search_path = public as $$
#variable_conflict use_variable
declare r rewards; bal int; rd redemptions; c text; tries int := 0;
begin
  select * into r from rewards rr where rr.id = reward_id and rr.active;
  if not found then return jsonb_build_object('status', 'no_reward'); end if;
  update profiles pp set points = pp.points - r.cost_points
    where pp.id = user_id and pp.points >= r.cost_points returning pp.points into bal;
  if not found then
    select pp.points into bal from profiles pp where pp.id = user_id;
    return jsonb_build_object('status', 'insufficient', 'balance', bal, 'needed', r.cost_points);
  end if;
  loop
    c := 'RG-' || (1000 + floor(random() * 9000))::int;
    begin
      insert into redemptions (user_id, reward_id, points, code) values (user_id, reward_id, r.cost_points, c)
        returning * into rd;
      exit;
    exception when unique_violation then
      tries := tries + 1;
      if tries > 20 then raise; end if;
    end;
  end loop;
  return jsonb_build_object('status', 'ok', 'redemption', to_jsonb(rd), 'reward', to_jsonb(r), 'balance', bal);
end $$;

create or replace function public.get_me(user_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
#variable_conflict use_variable
declare p profiles; s sessions; pet int; can int; sess int; redeemed int;
begin
  select * into p from profiles pp where pp.id = user_id;
  if not found then return jsonb_build_object('status', 'no_user'); end if;
  select count(*) filter (where dd.material = 'pet'), count(*) filter (where dd.material = 'can')
    into pet, can from deposits dd where dd.user_id = user_id;
  select count(*) into sess from sessions ss where ss.user_id = user_id and ss.status = 'ended';
  select count(*) into redeemed from redemptions rr where rr.user_id = user_id;
  select * into s from sessions ss where ss.user_id = user_id and ss.status = 'active'
    order by ss.started_at desc limit 1;
  return jsonb_build_object('status', 'ok', 'profile', to_jsonb(p),
    'stats', jsonb_build_object('pet', pet, 'can', can, 'sessions', sess, 'redemptions', redeemed),
    'active_session', case when s.id is null then null else to_jsonb(s) end);
end $$;

create or replace function public.get_history(user_id uuid) returns jsonb
language sql security definer set search_path = public as $$
  select coalesce(jsonb_agg(x order by x->>'at' desc), '[]'::jsonb) from (
    select jsonb_build_object('kind', 'deposit', 'id', s.id, 'at', coalesce(s.ended_at, s.started_at),
             'machine_id', s.machine_id, 'pet', s.pet_count, 'can', s.can_count, 'rejected', s.rejected_count,
             'points', s.points) as x
      from sessions s where s.user_id = get_history.user_id and s.status = 'ended'
    union all
    select jsonb_build_object('kind', 'redeem', 'id', rd.id, 'at', rd.created_at, 'title', r.title,
             'emoji', r.emoji, 'code', rd.code, 'points', -rd.points) as x
      from redemptions rd join rewards r on r.id = rd.reward_id where rd.user_id = get_history.user_id
    order by 1 limit 50
  ) t
$$;

create or replace function public.get_journey(user_id uuid, machine_id text default 'SG-SUN-01') returns jsonb
language plpgsql security definer set search_path = public as $$
#variable_conflict use_variable
declare m machines; last_collected timestamptz; mine int; building_month int; pk jsonb; nxt jsonb;
begin
  select * into m from machines mm where mm.id = machine_id;
  if not found then return jsonb_build_object('status', 'no_machine'); end if;
  select max(p.picked_at) into last_collected from pickups p
    where p.machine_id = machine_id and p.status in ('collected', 'verified');
  select count(*) into mine from deposits dd
    where dd.user_id = user_id and dd.machine_id = machine_id and dd.material <> 'rejected'
      and dd.created_at > coalesce(last_collected, '-infinity'::timestamptz);
  select count(*) into building_month from deposits dd
    where dd.machine_id = machine_id and dd.material <> 'rejected'
      and dd.created_at >= date_trunc('month', now());
  select coalesce(jsonb_agg(to_jsonb(p) order by p.picked_at desc), '[]'::jsonb) into pk
    from (select * from pickups pp where pp.machine_id = machine_id and pp.status <> 'scheduled'
          order by pp.picked_at desc limit 4) p;
  select to_jsonb(p) into nxt from pickups p
    where p.machine_id = machine_id and p.status = 'scheduled' order by p.picked_at asc limit 1;
  return jsonb_build_object('status', 'ok',
    'machine', jsonb_build_object('id', m.id, 'name', m.name, 'building', m.building, 'location', m.location,
                                  'fill_level', m.fill_level, 'fill_count', m.fill_count, 'capacity', m.capacity,
                                  'status', m.status),
    'partner', 'GreenLoop Recycling (demo)',
    'my_containers_in_batch', mine, 'building_month_total', building_month,
    'last_collected_at', last_collected, 'pickups', pk, 'next_pickup', nxt);
end $$;
