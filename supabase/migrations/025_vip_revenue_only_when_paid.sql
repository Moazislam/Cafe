-- Count only paid VIP item value in revenue and remove legacy unpaid entries.
delete from public.transactions transaction_log
where transaction_log.vip_purchase_id is not null
  and exists (
    select 1
    from public.vip_purchases purchase
    where purchase.id = transaction_log.vip_purchase_id
      and not purchase.paid
  );

create or replace function public.record_vip_transaction(p_purchase_id uuid)
returns public.transactions
language plpgsql
security definer set search_path = public
as $$
declare
  v_transaction public.transactions;
  v_purchase public.vip_purchases;
  v_amount numeric(10, 2);
begin
  if not public.is_operator() then raise exception 'Not authorized'; end if;

  select * into v_purchase
  from public.vip_purchases purchase
  where purchase.id = p_purchase_id
    and (purchase.paid or exists (select 1 from public.vip_purchase_items item where item.purchase_id = purchase.id and item.paid));
  if not found then raise exception 'Paid VIP purchase not found'; end if;

  if exists (select 1 from public.vip_purchase_items item where item.purchase_id = v_purchase.id) then
    select coalesce(sum(item.unit_price * item.quantity), 0) into v_amount
    from public.vip_purchase_items item
    where item.purchase_id = v_purchase.id and item.paid;
  else
    v_amount := v_purchase.amount;
  end if;

  update public.transactions
  set amount = v_amount
  where vip_purchase_id = p_purchase_id
  returning * into v_transaction;

  if not found then
    insert into public.transactions (kind, amount, vip_purchase_id, created_by)
    values ('ORDER', v_amount, v_purchase.id, v_purchase.created_by)
    returning * into v_transaction;
  end if;
  return v_transaction;
end;
$$;

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

  if exists (select 1 from public.vip_purchase_items item where item.purchase_id = v_item.purchase_id and item.paid) then
    perform public.record_vip_transaction(v_item.purchase_id);
  else
    delete from public.transactions where vip_purchase_id = v_item.purchase_id;
  end if;

  return v_item;
end;
$$;

revoke all on function public.record_vip_transaction(uuid) from public;
grant execute on function public.record_vip_transaction(uuid) to authenticated;
revoke all on function public.mark_vip_purchase_item_paid(uuid, boolean) from public;
grant execute on function public.mark_vip_purchase_item_paid(uuid, boolean) to authenticated;