-- Fix VIP transaction recording for the partial unique index.
create or replace function public.record_vip_transaction(p_purchase_id uuid)
returns public.transactions
language plpgsql
security definer set search_path = public
as $$
declare
  v_transaction public.transactions;
begin
  if not public.is_operator() then raise exception 'Not authorized'; end if;

  select * into v_transaction
  from public.transactions
  where vip_purchase_id = p_purchase_id;

  if found then return v_transaction; end if;

  insert into public.transactions (kind, amount, vip_purchase_id, created_by)
  select 'ORDER', purchase.amount, purchase.id, purchase.created_by
  from public.vip_purchases purchase
  where purchase.id = p_purchase_id
  returning * into v_transaction;

  if not found then raise exception 'VIP purchase not found'; end if;
  return v_transaction;
end;
$$;

revoke all on function public.record_vip_transaction(uuid) from public;
grant execute on function public.record_vip_transaction(uuid) to authenticated;