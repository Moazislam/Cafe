-- Cafe Management V1: single-cafe operational schema
create extension if not exists btree_gist;
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  username text,
  role text not null default 'STAFF' check (role in ('ADMIN', 'STAFF')),
  created_at timestamptz not null default now()
);

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  console_type text,
  hourly_rate numeric(10, 2) not null default 0 check (hourly_rate >= 0),
  status text not null default 'AVAILABLE' check (status in ('AVAILABLE', 'OCCUPIED', 'RESERVED', 'MAINTENANCE')),
  created_at timestamptz not null default now()
);

create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete restrict,
  customer_name text not null,
  customer_phone text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  status text not null default 'CONFIRMED' check (status in ('CONFIRMED', 'ACTIVE', 'COMPLETED', 'CANCELLED')),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  check (end_time > start_time)
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete restrict,
  reservation_id uuid unique references public.reservations(id) on delete set null,
  start_time timestamptz not null default now(),
  expected_end_time timestamptz,
  end_time timestamptz,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'COMPLETED', 'CANCELLED')),
  started_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  check (expected_end_time is null or expected_end_time > start_time),
  check (end_time is null or end_time >= start_time)
);

create unique index if not exists one_active_session_per_room
  on public.sessions(room_id) where status = 'ACTIVE';

create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  category text,
  quantity integer not null default 0 check (quantity >= 0),
  price numeric(10, 2) not null default 0 check (price >= 0),
  low_stock_threshold integer not null default 5 check (low_stock_threshold >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.rooms(id) on delete set null,
  session_id uuid references public.sessions(id) on delete set null,
  total numeric(10, 2) not null default 0 check (total >= 0),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  inventory_item_id uuid not null references public.inventory_items(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  unit_price numeric(10, 2) not null check (unit_price >= 0),
  created_at timestamptz not null default now()
);

alter table public.reservations drop constraint if exists reservations_no_overlap;
alter table public.reservations add constraint reservations_no_overlap
  exclude using gist (
    room_id with =,
    tstzrange(start_time, end_time, '[)') with &&
  ) where (status in ('CONFIRMED', 'ACTIVE'));

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists inventory_items_updated_at on public.inventory_items;
create trigger inventory_items_updated_at before update on public.inventory_items
for each row execute procedure public.set_updated_at();

create or replace function public.create_profile_for_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    lower(trim(coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1))))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.create_profile_for_user();

insert into public.profiles (id, full_name, username)
select
  id,
  coalesce(raw_user_meta_data ->> 'full_name', split_part(email, '@', 1)),
  lower(trim(coalesce(raw_user_meta_data ->> 'username', split_part(email, '@', 1))))
from auth.users
on conflict (id) do nothing;

create or replace function public.is_operator()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('ADMIN', 'STAFF')
  );
$$;

create or replace function public.sync_room_status(p_room_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_status text;
begin
  select status into v_status from public.rooms where id = p_room_id for update;
  if not found or v_status = 'MAINTENANCE' then return; end if;

  if exists (select 1 from public.sessions where room_id = p_room_id and status = 'ACTIVE') then
    update public.rooms set status = 'OCCUPIED' where id = p_room_id;
  elsif exists (
    select 1 from public.reservations
    where room_id = p_room_id and status = 'CONFIRMED'
      and start_time <= now() and end_time > now()
  ) then
    update public.rooms set status = 'RESERVED' where id = p_room_id;
  else
    update public.rooms set status = 'AVAILABLE' where id = p_room_id;
  end if;
end;
$$;

create or replace function public.sync_room_after_reservation()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.sync_room_status(old.room_id);
  else
    perform public.sync_room_status(new.room_id);
    if tg_op = 'UPDATE' and old.room_id <> new.room_id then perform public.sync_room_status(old.room_id); end if;
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists reservations_sync_room on public.reservations;
create trigger reservations_sync_room after insert or update or delete on public.reservations
for each row execute procedure public.sync_room_after_reservation();

create or replace function public.start_session(
  p_room_id uuid,
  p_duration_minutes integer,
  p_reservation_id uuid default null
)
returns public.sessions
language plpgsql
security definer set search_path = public
as $$
declare
  v_room public.rooms;
  v_reservation public.reservations;
  v_session public.sessions;
begin
  if not public.is_operator() then raise exception 'Not authorized'; end if;
  if p_duration_minutes is null or p_duration_minutes <= 0 then raise exception 'Duration must be greater than zero'; end if;

  select * into v_room from public.rooms where id = p_room_id for update;
  if not found then raise exception 'Room not found'; end if;
  if v_room.status in ('OCCUPIED', 'MAINTENANCE') then raise exception 'Room is not available'; end if;

  if p_reservation_id is not null then
    select * into v_reservation from public.reservations where id = p_reservation_id for update;
    if not found or v_reservation.room_id <> p_room_id or v_reservation.status <> 'CONFIRMED' then
      raise exception 'Reservation cannot be used to start this session';
    end if;
    if now() < v_reservation.start_time or now() >= v_reservation.end_time then
      raise exception 'Reservation is not currently active';
    end if;
  elsif exists (
    select 1 from public.reservations
    where room_id = p_room_id and status in ('CONFIRMED', 'ACTIVE')
      and tstzrange(start_time, end_time, '[)') && tstzrange(now(), now() + make_interval(mins => p_duration_minutes), '[)')
  ) then
    raise exception 'Room has a conflicting reservation';
  end if;

  insert into public.sessions (room_id, reservation_id, expected_end_time, status, started_by)
  values (p_room_id, p_reservation_id, now() + make_interval(mins => p_duration_minutes), 'ACTIVE', auth.uid())
  returning * into v_session;

  if p_reservation_id is not null then
    update public.reservations set status = 'ACTIVE' where id = p_reservation_id;
  end if;
  update public.rooms set status = 'OCCUPIED' where id = p_room_id;
  return v_session;
end;
$$;

create or replace function public.end_session(p_session_id uuid)
returns public.sessions
language plpgsql
security definer set search_path = public
as $$
declare
  v_session public.sessions;
begin
  if not public.is_operator() then raise exception 'Not authorized'; end if;
  select * into v_session from public.sessions where id = p_session_id for update;
  if not found or v_session.status <> 'ACTIVE' then raise exception 'Active session not found'; end if;

  update public.sessions set status = 'COMPLETED', end_time = now() where id = p_session_id returning * into v_session;
  if v_session.reservation_id is not null then
    update public.reservations set status = 'COMPLETED' where id = v_session.reservation_id;
  end if;
  perform public.sync_room_status(v_session.room_id);
  return v_session;
end;
$$;

create or replace function public.cancel_reservation(p_reservation_id uuid)
returns public.reservations
language plpgsql
security definer set search_path = public
as $$
declare
  v_reservation public.reservations;
begin
  if not public.is_operator() then raise exception 'Not authorized'; end if;
  select * into v_reservation from public.reservations where id = p_reservation_id for update;
  if not found or v_reservation.status <> 'CONFIRMED' then raise exception 'Only confirmed reservations can be cancelled'; end if;
  update public.reservations set status = 'CANCELLED' where id = p_reservation_id returning * into v_reservation;
  perform public.sync_room_status(v_reservation.room_id);
  return v_reservation;
end;
$$;

create or replace function public.create_order(
  p_room_id uuid,
  p_session_id uuid,
  p_items jsonb
)
returns public.orders
language plpgsql
security definer set search_path = public
as $$
declare
  v_order public.orders;
  v_item record;
  v_stock public.inventory_items;
  v_total numeric(10, 2) := 0;
begin
  if not public.is_operator() then raise exception 'Not authorized'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'An order needs at least one item'; end if;

  if p_session_id is not null and not exists (
    select 1 from public.sessions where id = p_session_id and room_id = p_room_id and status = 'ACTIVE'
  ) then raise exception 'Orders can only be added to an active room session'; end if;

  insert into public.orders (room_id, session_id, created_by) values (p_room_id, p_session_id, auth.uid()) returning * into v_order;

  for v_item in select * from jsonb_to_recordset(p_items) as x(inventory_item_id uuid, quantity integer) loop
    if v_item.quantity is null or v_item.quantity <= 0 then raise exception 'Order quantities must be positive'; end if;
    select * into v_stock from public.inventory_items where id = v_item.inventory_item_id and active = true for update;
    if not found then raise exception 'Inventory item not found'; end if;
    if v_stock.quantity < v_item.quantity then raise exception 'Insufficient stock for %', v_stock.name; end if;
    update public.inventory_items set quantity = quantity - v_item.quantity where id = v_stock.id;
    insert into public.order_items (order_id, inventory_item_id, quantity, unit_price)
      values (v_order.id, v_stock.id, v_item.quantity, v_stock.price);
    v_total := v_total + (v_stock.price * v_item.quantity);
  end loop;

  update public.orders set total = v_total where id = v_order.id returning * into v_order;
  return v_order;
end;
$$;

alter table public.profiles enable row level security;
alter table public.rooms enable row level security;
alter table public.reservations enable row level security;
alter table public.sessions enable row level security;
alter table public.inventory_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

drop policy if exists "profiles select own" on public.profiles;
drop policy if exists "operators read rooms" on public.rooms;
drop policy if exists "operators update rooms" on public.rooms;
drop policy if exists "operators read reservations" on public.reservations;
drop policy if exists "operators create reservations" on public.reservations;
drop policy if exists "operators read sessions" on public.sessions;
drop policy if exists "operators read inventory" on public.inventory_items;
drop policy if exists "operators create inventory" on public.inventory_items;
drop policy if exists "operators update inventory" on public.inventory_items;
drop policy if exists "operators read orders" on public.orders;
drop policy if exists "operators read order items" on public.order_items;

create policy "profiles select own" on public.profiles for select to authenticated using (id = auth.uid() or public.is_operator());
create policy "operators read rooms" on public.rooms for select to authenticated using (public.is_operator());
create policy "operators update rooms" on public.rooms for update to authenticated using (public.is_operator()) with check (public.is_operator());
create policy "operators read reservations" on public.reservations for select to authenticated using (public.is_operator());
create policy "operators create reservations" on public.reservations for insert to authenticated with check (public.is_operator());
create policy "operators read sessions" on public.sessions for select to authenticated using (public.is_operator());
create policy "operators read inventory" on public.inventory_items for select to authenticated using (public.is_operator());
create policy "operators create inventory" on public.inventory_items for insert to authenticated with check (public.is_operator());
create policy "operators update inventory" on public.inventory_items for update to authenticated using (public.is_operator()) with check (public.is_operator());
create policy "operators read orders" on public.orders for select to authenticated using (public.is_operator());
create policy "operators read order items" on public.order_items for select to authenticated using (public.is_operator());

revoke execute on function public.sync_room_status(uuid) from public;
revoke execute on function public.start_session(uuid, integer, uuid) from public;
revoke execute on function public.end_session(uuid) from public;
revoke execute on function public.cancel_reservation(uuid) from public;
revoke execute on function public.create_order(uuid, uuid, jsonb) from public;
grant execute on function public.start_session(uuid, integer, uuid) to authenticated;
grant execute on function public.end_session(uuid) to authenticated;
grant execute on function public.cancel_reservation(uuid) to authenticated;
grant execute on function public.create_order(uuid, uuid, jsonb) to authenticated;

insert into public.rooms (name, console_type, hourly_rate) values
  ('Room 1', 'PlayStation 4', 35),
  ('Room 2', 'PlayStation 5', 45),
  ('Room 3', 'PlayStation 4', 35),
  ('Room 4', 'PlayStation 4', 35),
  ('Room 5', 'PlayStation 4', 35)
on conflict (name) do nothing;

insert into public.inventory_items (name, category, quantity, price, low_stock_threshold) values
  ('Cola', 'Drinks', 24, 25, 8),
  ('Water', 'Drinks', 30, 10, 10),
  ('Chips', 'Snacks', 18, 20, 6),
  ('Energy Drink', 'Drinks', 12, 45, 5)
on conflict (name) do nothing;
