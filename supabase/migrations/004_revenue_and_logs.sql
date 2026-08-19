-- Adds room-time billing, a revenue/transaction log, and daily/monthly revenue views.

alter table public.sessions add column if not exists amount numeric(10, 2);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('SESSION', 'ORDER')),
  amount numeric(10, 2) not null default 0 check (amount >= 0),
  room_id uuid references public.rooms(id) on delete set null,
  session_id uuid references public.sessions(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists transactions_created_at_idx on public.transactions (created_at desc);
create index if not exists transactions_kind_idx on public.transactions (kind);

alter table public.transactions enable row level security;
drop policy if exists "operators read transactions" on public.transactions;
create policy "operators read transactions" on public.transactions
  for select to authenticated using (public.is_operator());

-- Room-time billing: charge = hourly_rate * actual elapsed hours, rounded to the cent.
create or replace function public.end_session(p_session_id uuid)
returns public.sessions
language plpgsql
security definer set search_path = public
as $$
declare
  v_session public.sessions;
  v_room public.rooms;
  v_amount numeric(10, 2);
begin
  if not public.is_operator() then raise exception 'Not authorized'; end if;
  select * into v_session from public.sessions where id = p_session_id for update;
  if not found or v_session.status <> 'ACTIVE' then raise exception 'Active session not found'; end if;

  select * into v_room from public.rooms where id = v_session.room_id;
  v_amount := round(coalesce(v_room.hourly_rate, 0) * (extract(epoch from (now() - v_session.start_time)) / 3600.0), 2);

  update public.sessions
    set status = 'COMPLETED', end_time = now(), amount = v_amount
    where id = p_session_id
    returning * into v_session;

  if v_session.reservation_id is not null then
    update public.reservations set status = 'COMPLETED' where id = v_session.reservation_id;
  end if;

  insert into public.transactions (kind, amount, room_id, session_id, created_by)
    values ('SESSION', v_amount, v_session.room_id, v_session.id, auth.uid());

  perform public.sync_room_status(v_session.room_id);
  return v_session;
end;
$$;

-- Order revenue log: record each completed counter order as a transaction.
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

  insert into public.transactions (kind, amount, room_id, order_id, created_by)
    values ('ORDER', v_total, p_room_id, v_order.id, auth.uid());

  return v_order;
end;
$$;

create or replace view public.daily_revenue as
select
  date_trunc('day', created_at)::date as day,
  sum(amount) filter (where kind = 'SESSION') as session_revenue,
  sum(amount) filter (where kind = 'ORDER') as order_revenue,
  sum(amount) as total_revenue
from public.transactions
group by 1
order by 1 desc;

create or replace view public.monthly_revenue as
select
  date_trunc('month', created_at)::date as month,
  sum(amount) filter (where kind = 'SESSION') as session_revenue,
  sum(amount) filter (where kind = 'ORDER') as order_revenue,
  sum(amount) as total_revenue
from public.transactions
group by 1
order by 1 desc;

grant select on public.daily_revenue to authenticated;
grant select on public.monthly_revenue to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'transactions'
  ) then
    execute 'alter publication supabase_realtime add table public.transactions';
  end if;
end;
$$;
