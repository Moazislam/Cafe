-- Queue operational alerts for the server-side email worker.
create table if not exists public.admin_alert_events (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('LOW_STOCK', 'MAINTENANCE')),
  payload jsonb not null,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

alter table public.admin_alert_events enable row level security;
revoke all on public.admin_alert_events from anon, authenticated;

create or replace function public.queue_low_stock_alert()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.quantity <= new.low_stock_threshold
     and (tg_op = 'INSERT' or old.quantity > old.low_stock_threshold) then
    insert into public.admin_alert_events (kind, payload)
    values ('LOW_STOCK', jsonb_build_object(
      'item_id', new.id,
      'item_name', new.name,
      'quantity', new.quantity,
      'low_stock_threshold', new.low_stock_threshold
    ));
  end if;
  return new;
end;
$$;

drop trigger if exists inventory_low_stock_alert on public.inventory_items;
create trigger inventory_low_stock_alert
after insert or update of name, quantity, low_stock_threshold on public.inventory_items
for each row execute procedure public.queue_low_stock_alert();

create or replace function public.queue_maintenance_alert()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.status = 'MAINTENANCE' and (tg_op = 'INSERT' or old.status <> 'MAINTENANCE') then
    insert into public.admin_alert_events (kind, payload)
    values ('MAINTENANCE', jsonb_build_object(
      'room_id', new.id,
      'room_name', new.name
    ));
  end if;
  return new;
end;
$$;

drop trigger if exists room_maintenance_alert on public.rooms;
create trigger room_maintenance_alert
after insert or update of name, status on public.rooms
for each row execute procedure public.queue_maintenance_alert();