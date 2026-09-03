-- Demo reset (re-seeds everything; NOT granted to anon — run from the Supabase MCP / SQL editor)
create or replace function public.reset_demo() returns void
language plpgsql security definer set search_path = public as $$
declare u1 uuid := '00000000-0000-4000-8000-000000000001';
        u2 uuid := '00000000-0000-4000-8000-000000000002';
        u3 uuid := '00000000-0000-4000-8000-000000000003';
        u4 uuid := '00000000-0000-4000-8000-000000000004';
        s1 uuid := '00000000-0000-4000-8000-0000000000a1';
        s2 uuid := '00000000-0000-4000-8000-0000000000a2';
        s3 uuid := '00000000-0000-4000-8000-0000000000a3';
begin
  delete from deposits; delete from redemptions; delete from sessions; delete from pickups;
  delete from profiles; delete from rewards; delete from machines;

  insert into machines (id, name, building, location, fill_count, capacity, status, machine_key) values
    ('SG-SUN-01', 'Lobby A', 'Sunrise Tower', 'Ground floor, next to the mailboxes', 272, 400, 'online',
     'k_SUN01_3f9c1e7a5d');

  insert into profiles (id, phone, name, building, points) values
    (u1, '0900000001', 'Dat Ninh', 'Sunrise Tower', 1500),
    (u2, '0900000002', 'Linh Tran', 'Sunrise Tower', 620),
    (u3, '0900000003', 'Minh Le', 'Sunrise Tower', 310),
    (u4, '0900000004', 'Huong Pham', 'Sunrise Tower', 975);

  insert into rewards (id, title, category, cost_points, vnd_value, note, detail, emoji, sort) values
    ('dishwash-500', 'Dishwash refill 500 ml', 'refill', 500, 12500, 'Bring your own bottle',
       'Refill at the lobby station shelf. Show your code to the building staff.', '🫧', 1),
    ('shampoo-400', 'Shampoo refill 400 ml', 'refill', 700, 17500, 'Station shelf pick-up',
       'Collect from the RefillGo shelf next to the station.', '🧴', 2),
    ('laundry-1l', 'Laundry refill 1 L', 'refill', 1000, 25000, 'Bring your own bottle',
       'Refill at the lobby station shelf.', '🧺', 3),
    ('voucher-20k', 'Grocery voucher 20,000 đ', 'voucher', 800, 20000, 'Partner mini-mart',
       '20,000 đ voucher at the partner mini-mart. The 600 đ redemption fee is covered by RefillGo.', '🎟', 4),
    ('cafe-espresso', 'Lobby café espresso', 'cafe', 600, 15000, 'Sunrise Tower café',
       'One espresso at the lobby café. Show your code at the counter.', '☕', 5);

  insert into pickups (machine_id, partner, weight_kg, batch_code, status, picked_at) values
    ('SG-SUN-01', 'GreenLoop Recycling (demo)', 13.1, 'GL-SUN-0818', 'verified', '2026-08-18 07:30+07'),
    ('SG-SUN-01', 'GreenLoop Recycling (demo)', 16.4, 'GL-SUN-0825', 'verified', '2026-08-25 07:30+07'),
    ('SG-SUN-01', 'GreenLoop Recycling (demo)', 18.2, 'GL-SUN-0901', 'verified', '2026-09-01 07:30+07'),
    ('SG-SUN-01', 'GreenLoop Recycling (demo)', null, 'GL-SUN-0910', 'scheduled', '2026-09-10 07:30+07');

  insert into sessions (id, machine_id, user_id, display_name, status, pet_count, can_count, rejected_count, points,
                        started_at, last_activity_at, ended_at) values
    (s1, 'SG-SUN-01', u1, 'Dat Ninh', 'ended', 4, 2, 0, 70, '2026-09-03 18:20+07', '2026-09-03 18:22+07', '2026-09-03 18:22+07'),
    (s2, 'SG-SUN-01', u1, 'Dat Ninh', 'ended', 6, 0, 1, 60, '2026-09-01 20:09+07', '2026-09-01 20:11+07', '2026-09-01 20:11+07'),
    (s3, 'SG-SUN-01', u1, 'Dat Ninh', 'ended', 3, 3, 0, 75, '2026-08-28 19:45+07', '2026-08-28 19:47+07', '2026-08-28 19:47+07');

  insert into deposits (session_id, user_id, machine_id, material, points, created_at)
    select s1, u1, 'SG-SUN-01', m, points_for(m), '2026-09-03 18:20+07'::timestamptz + (i || ' seconds')::interval
      from unnest(array['pet','pet','can','pet','can','pet']) with ordinality as t(m, i);
  insert into deposits (session_id, user_id, machine_id, material, points, created_at)
    select s2, u1, 'SG-SUN-01', m, points_for(m), '2026-09-01 20:09+07'::timestamptz + (i || ' seconds')::interval
      from unnest(array['pet','pet','rejected','pet','pet','pet','pet']) with ordinality as t(m, i);
  insert into deposits (session_id, user_id, machine_id, material, points, created_at)
    select s3, u1, 'SG-SUN-01', m, points_for(m), '2026-08-28 19:45+07'::timestamptz + (i || ' seconds')::interval
      from unnest(array['can','pet','can','pet','can','pet']) with ordinality as t(m, i);

  insert into redemptions (user_id, reward_id, points, code, status, created_at) values
    (u1, 'dishwash-500', 500, 'RG-2381', 'issued', '2026-08-31 09:04+07');
end $$;

-- Function privileges: only the public RPCs are callable with the anon key
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.login_with_phone(text, text) to anon, authenticated;
grant execute on function public.start_session(uuid, text) to anon, authenticated;
grant execute on function public.end_session(uuid) to anon, authenticated;
grant execute on function public.record_deposit(text, text, text, uuid) to anon, authenticated;
grant execute on function public.redeem_reward(uuid, text) to anon, authenticated;
grant execute on function public.get_me(uuid) to anon, authenticated;
grant execute on function public.get_history(uuid) to anon, authenticated;
grant execute on function public.get_journey(uuid, text) to anon, authenticated;
alter default privileges for role postgres in schema public revoke execute on functions from public, anon, authenticated;

select public.reset_demo();
