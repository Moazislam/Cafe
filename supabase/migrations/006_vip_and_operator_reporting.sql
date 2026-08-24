-- VIP customer spending ledger.
create table if not exists public.vip_purchases (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null check (length(trim(customer_name)) > 0),
  items text not null check (length(trim(items)) > 0),
  amount numeric(10, 2) not null check (amount >= 0),
  paid boolean not null default false,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

alter table public.vip_purchases enable row level security;
drop policy if exists "operators read vip purchases" on public.vip_purchases;
create policy "operators read vip purchases" on public.vip_purchases
  for select to authenticated using (public.is_operator());
drop policy if exists "operators create vip purchases" on public.vip_purchases;
create policy "operators create vip purchases" on public.vip_purchases
  for insert to authenticated with check (public.is_operator() and created_by = auth.uid());
drop policy if exists "operators update vip purchases" on public.vip_purchases;
create policy "operators update vip purchases" on public.vip_purchases
  for update to authenticated using (public.is_operator()) with check (public.is_operator());

create or replace function public.mark_vip_purchase_paid(p_purchase_id uuid, p_paid boolean)
returns public.vip_purchases
language plpgsql
security definer set search_path = public
as $$
declare
  v_purchase public.vip_purchases;
begin
  if not public.is_operator() then raise exception 'Not authorized'; end if;
  update public.vip_purchases
  set paid = p_paid, paid_at = case when p_paid then coalesce(paid_at, now()) else null end
  where id = p_purchase_id
  returning * into v_purchase;
  if not found then raise exception 'VIP purchase not found'; end if;
  return v_purchase;
end;
$$;

revoke all on function public.mark_vip_purchase_paid(uuid, boolean) from public;
grant execute on function public.mark_vip_purchase_paid(uuid, boolean) to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'vip_purchases'
  ) then
    execute 'alter publication supabase_realtime add table public.vip_purchases';
  end if;
end;
$$;