-- Track payment status for each item in a VIP purchase.
create table if not exists public.vip_purchase_items (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.vip_purchases(id) on delete cascade,
  item_name text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(10, 2) not null check (unit_price >= 0),
  paid boolean not null default false,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists vip_purchase_items_purchase_id_idx on public.vip_purchase_items(purchase_id);
alter table public.vip_purchase_items enable row level security;

drop policy if exists "operators read vip purchase items" on public.vip_purchase_items;
create policy "operators read vip purchase items" on public.vip_purchase_items
  for select to authenticated using (public.is_operator());
drop policy if exists "operators create vip purchase items" on public.vip_purchase_items;
create policy "operators create vip purchase items" on public.vip_purchase_items
  for insert to authenticated with check (public.is_operator());

create or replace function public.mark_vip_purchase_item_paid(p_item_id uuid, p_paid boolean)
returns public.vip_purchase_items
language plpgsql
security definer set search_path = public
as $$
declare
  v_item public.vip_purchase_items;
begin
  if not public.is_operator() then raise exception 'Not authorized'; end if;

  update public.vip_purchase_items
  set paid = p_paid, paid_at = case when p_paid then coalesce(paid_at, now()) else null end
  where id = p_item_id
  returning * into v_item;
  if not found then raise exception 'VIP purchase item not found'; end if;

  update public.vip_purchases purchase
  set paid = not exists (
    select 1 from public.vip_purchase_items item
    where item.purchase_id = v_item.purchase_id and not item.paid
  ),
  paid_at = case when not exists (
    select 1 from public.vip_purchase_items item
    where item.purchase_id = v_item.purchase_id and not item.paid
  ) then coalesce(paid_at, now()) else null end
  where purchase.id = v_item.purchase_id;

  return v_item;
end;
$$;

revoke all on function public.mark_vip_purchase_item_paid(uuid, boolean) from public;
grant execute on function public.mark_vip_purchase_item_paid(uuid, boolean) to authenticated;