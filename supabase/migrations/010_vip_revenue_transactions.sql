-- Include VIP purchases in the existing order revenue and transaction logs.
alter table public.transactions add column if not exists vip_purchase_id uuid references public.vip_purchases(id) on delete set null;
create unique index if not exists transactions_vip_purchase_unique
  on public.transactions(vip_purchase_id) where vip_purchase_id is not null;

insert into public.transactions (kind, amount, vip_purchase_id, created_by, created_at)
select 'ORDER', purchase.amount, purchase.id, purchase.created_by, purchase.created_at
from public.vip_purchases purchase
where not exists (
  select 1 from public.transactions transaction_log
  where transaction_log.vip_purchase_id = purchase.id
);

create or replace function public.record_vip_transaction(p_purchase_id uuid)
returns public.transactions
language plpgsql
security definer set search_path = public
as $$
declare
  v_transaction public.transactions;
begin
  if not public.is_operator() then raise exception 'Not authorized'; end if;

  insert into public.transactions (kind, amount, vip_purchase_id, created_by)
  select 'ORDER', purchase.amount, purchase.id, purchase.created_by
  from public.vip_purchases purchase
  where purchase.id = p_purchase_id
  on conflict (vip_purchase_id) do update set vip_purchase_id = excluded.vip_purchase_id
  returning * into v_transaction;

  if not found then raise exception 'VIP purchase not found'; end if;
  return v_transaction;
end;
$$;

revoke all on function public.record_vip_transaction(uuid) from public;
grant execute on function public.record_vip_transaction(uuid) to authenticated;