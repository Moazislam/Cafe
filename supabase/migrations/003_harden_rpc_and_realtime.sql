-- Applies the release hardening to projects that already ran earlier migrations.
revoke execute on function public.sync_room_status(uuid) from public;
revoke execute on function public.start_session(uuid, integer, uuid) from public;
revoke execute on function public.end_session(uuid) from public;
revoke execute on function public.cancel_reservation(uuid) from public;
revoke execute on function public.create_order(uuid, uuid, jsonb) from public;
grant execute on function public.start_session(uuid, integer, uuid) to authenticated;
grant execute on function public.end_session(uuid) to authenticated;
grant execute on function public.cancel_reservation(uuid) to authenticated;
grant execute on function public.create_order(uuid, uuid, jsonb) to authenticated;

do $$
declare
  table_name text;
begin
  foreach table_name in array array['rooms', 'reservations', 'sessions', 'inventory_items', 'orders', 'order_items'] loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = table_name
    ) then
      execute format('alter publication supabase_realtime add table public.%I', table_name);
    end if;
  end loop;
end;
$$;
