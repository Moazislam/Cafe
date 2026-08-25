-- Archive inventory items only when no stock remains, preserving order history.
create or replace function public.archive_inventory_item(p_item_id uuid)
returns public.inventory_items
language plpgsql
security definer set search_path = public
as $$
declare
  v_item public.inventory_items;
begin
  if not public.is_operator() then raise exception 'Not authorized'; end if;

  update public.inventory_items
  set active = false
  where id = p_item_id and active = true and quantity = 0
  returning * into v_item;

  if not found then raise exception 'Only zero-stock items can be deleted'; end if;
  return v_item;
end;
$$;

revoke all on function public.archive_inventory_item(uuid) from public;
grant execute on function public.archive_inventory_item(uuid) to authenticated;