-- Allow operators to remove VIP customer records only after all items are paid.
create or replace function public.delete_vip_customer(p_customer_name text)
returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  v_customer_name text := trim(p_customer_name);
  v_deleted integer;
begin
  if not public.is_operator() then raise exception 'Not authorized'; end if;
  if v_customer_name = '' then raise exception 'Customer name is required'; end if;

  if exists (
    select 1
    from public.vip_purchases purchase
    where purchase.customer_name = v_customer_name
      and (
        not purchase.paid
        or exists (
          select 1
          from public.vip_purchase_items item
          where item.purchase_id = purchase.id and not item.paid
        )
      )
  ) then
    raise exception 'VIP customer still has an outstanding balance';
  end if;

  delete from public.vip_purchases where customer_name = v_customer_name;
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke all on function public.delete_vip_customer(text) from public;
grant execute on function public.delete_vip_customer(text) to authenticated;