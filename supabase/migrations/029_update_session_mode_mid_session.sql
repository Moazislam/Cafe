-- Allow operators to switch an active session between single and multiplayer billing.
create or replace function public.update_session_room_mode(
  p_session_id uuid,
  p_room_mode text
)
returns public.sessions
language plpgsql
security definer set search_path = public
as $$
declare
  v_session public.sessions;
begin
  if not public.is_operator() then
    raise exception 'Not authorized';
  end if;

  if p_room_mode not in ('SINGLE', 'MULTIPLAYER') then
    raise exception 'Invalid room mode';
  end if;

  select * into v_session
  from public.sessions
  where id = p_session_id and status = 'ACTIVE'
  for update;

  if not found then
    raise exception 'Active session not found';
  end if;

  update public.sessions
    set room_mode = p_room_mode
    where id = p_session_id
    returning * into v_session;

  return v_session;
end;
$$;

revoke all on function public.update_session_room_mode(uuid, text) from public;
grant execute on function public.update_session_room_mode(uuid, text) to authenticated;
