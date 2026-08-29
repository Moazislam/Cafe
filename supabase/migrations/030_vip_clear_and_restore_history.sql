-- Allow VIP history to be cleared and item-level reversals to restore stock.
alter table public.vip_purchase_items
  add column if not exists inventory_item_id uuid references public.inventory_items(id) on delete restrict;

create or replace function public.delete_vip_purchase_item(p_item_id uuid)
returns public.vip_purchase_items
language plpgsql
security definer set search_path = public
as $$
declare
  v_item public.vip_purchase_items;
begin
  if not public.is_operator() then
    raise exception 'Not authorized';
  end if;

  select * into v_item
  from public.vip_purchase_items
  where id = p_item_id
  for update;

  if not found then
    raise exception 'VIP purchase item not found';
  end if;

  if v_item.paid then
    delete from public.vip_purchase_items
    where id = p_item_id
    returning * into v_item;

    delete from public.vip_purchases purchase
    where purchase.id = v_item.purchase_id
      and not exists (select 1 from public.vip_purchase_items item where item.purchase_id = purchase.id);

    return v_item;
  end if;

  if v_item.inventory_item_id is not null then
    update public.inventory_items
      set quantity = quantity + v_item.quantity
      where id = v_item.inventory_item_id and active = true;

    if not found then
      raise exception 'VIP inventory item is no longer available';
    end if;
  end if;

  delete from public.vip_purchase_items
  where id = p_item_id
  returning * into v_item;

  update public.vip_purchases purchase
    set paid = not exists (
      select 1
      from public.vip_purchase_items item
      where item.purchase_id = purchase.id and not item.paid
    ),
    paid_at = case when not exists (
      select 1
      from public.vip_purchase_items item
      where item.purchase_id = purchase.id and not item.paid
    ) then coalesce(purchase.paid_at, now()) else null end
    where purchase.id = v_item.purchase_id;

  if exists (select 1 from public.vip_purchase_items item where item.purchase_id = v_item.purchase_id and item.paid) then
    perform public.record_vip_transaction(v_item.purchase_id);
  else
    delete from public.transactions where vip_purchase_id = v_item.purchase_id;
  end if;

  delete from public.vip_purchases purchase
  where purchase.id = v_item.purchase_id
    and not exists (select 1 from public.vip_purchase_items item where item.purchase_id = purchase.id);

  return v_item;
end;
$$;

revoke all on function public.delete_vip_purchase_item(uuid) from public;
grant execute on function public.delete_vip_purchase_item(uuid) to authenticated;

create or replace function public.clear_paid_vip_customer_history(p_customer_name text)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_customer_name text := trim(p_customer_name);
  v_item record;
begin
  if not public.is_operator() then
    raise exception 'Not authorized';
  end if;
  if v_customer_name = '' then
    raise exception 'Customer name is required';
  end if;

  for v_item in
    select item.id, item.purchase_id, item.inventory_item_id, item.quantity
    from public.vip_purchase_items item
    join public.vip_purchases purchase on purchase.id = item.purchase_id
    where purchase.customer_name = v_customer_name
      and item.paid = true
    for update
  loop
    if v_item.inventory_item_id is not null then
      update public.inventory_items
        set quantity = quantity + v_item.quantity
        where id = v_item.inventory_item_id and active = true;
    end if;

    delete from public.transactions
    where vip_purchase_id = v_item.purchase_id;

    delete from public.vip_purchase_items
    where id = v_item.id;
  end loop;

  delete from public.vip_purchases purchase
  where purchase.customer_name = v_customer_name
    and not exists (select 1 from public.vip_purchase_items item where item.purchase_id = purchase.id);

  update public.vip_purchases purchase
    set paid = not exists (
      select 1
      from public.vip_purchase_items item
      where item.purchase_id = purchase.id and not item.paid
    ),
    paid_at = case when not exists (
      select 1
      from public.vip_purchase_items item
      where item.purchase_id = purchase.id and not item.paid
    ) then coalesce(purchase.paid_at, now()) else null end
    where purchase.customer_name = v_customer_name;

  for v_item in
    select purchase.id as purchase_id
    from public.vip_purchases purchase
    where purchase.customer_name = v_customer_name
  loop
    if exists (select 1 from public.vip_purchase_items item where item.purchase_id = v_item.purchase_id and item.paid) then
      perform public.record_vip_transaction(v_item.purchase_id);
    else
      delete from public.transactions where vip_purchase_id = v_item.purchase_id;
    end if;
  end loop;
end;
$$;

revoke all on function public.clear_paid_vip_customer_history(text) from public;
grant execute on function public.clear_paid_vip_customer_history(text) to authenticated;
