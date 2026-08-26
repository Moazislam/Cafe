-- Cancel an active session without recording room-time revenue.
create or replace function public.cancel_session(p_session_id uuid)
returns public.sessions
language plpgsql
security definer set search_path = public
as $$
declare
  v_session public.sessions;
begin
  if not public.is_operator() then raise exception 'Not authorized'; end if;

  update public.sessions
  set status = 'CANCELLED', end_time = now(), amount = 0
  where id = p_session_id and status = 'ACTIVE'
  returning * into v_session;
  if not found then raise exception 'Active session not found'; end if;

  if v_session.reservation_id is not null then
    update public.reservations set status = 'CANCELLED'
    where id = v_session.reservation_id and status = 'ACTIVE';
  end if;

  perform public.sync_room_status(v_session.room_id);
  return v_session;
end;
$$;

revoke all on function public.cancel_session(uuid) from public;
grant execute on function public.cancel_session(uuid) to authenticated;