-- Atomically reserve or release inventory for VIP cart items.
create or replace function public.adjust_inventory_stock(p_item_id uuid, p_delta integer)
returns public.inventory_items
language plpgsql
security definer set search_path = public
as $$
declare
  v_item public.inventory_items;
begin
  if not public.is_operator() then raise exception 'Not authorized'; end if;
  if p_delta is null or p_delta = 0 then raise exception 'Stock adjustment cannot be zero'; end if;

  update public.inventory_items
  set quantity = quantity + p_delta
  where id = p_item_id and active = true and quantity + p_delta >= 0
  returning * into v_item;

  if not found then raise exception 'Not enough stock available'; end if;
  return v_item;
end;
$$;

revoke all on function public.adjust_inventory_stock(uuid, integer) from public;
grant execute on function public.adjust_inventory_stock(uuid, integer) to authenticated;