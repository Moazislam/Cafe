-- Round room session charges up to the nearest 5 EGP.
create or replace function public.end_session(p_session_id uuid)
returns public.sessions
language plpgsql
security definer set search_path = public
as $$
declare
  v_session public.sessions;
  v_room public.rooms;
  v_elapsed_minutes numeric;
  v_billable_minutes numeric;
  v_amount numeric(10, 2);
begin
  if not public.is_operator() then raise exception 'Not authorized'; end if;
  select * into v_session from public.sessions where id = p_session_id for update;
  if not found or v_session.status <> 'ACTIVE' then raise exception 'Active session not found'; end if;

  select * into v_room from public.rooms where id = v_session.room_id;
  v_elapsed_minutes := greatest(0, extract(epoch from (now() - v_session.start_time)) / 60.0);
  v_billable_minutes := greatest(60, round(v_elapsed_minutes / 15.0) * 15);
  v_amount := ceil((coalesce(v_room.hourly_rate, 0) * (v_billable_minutes / 60.0)) / 5) * 5;

  update public.sessions
    set status = 'COMPLETED', end_time = now(), amount = v_amount
    where id = p_session_id
    returning * into v_session;

  if v_session.reservation_id is not null then
    update public.reservations set status = 'COMPLETED' where id = v_session.reservation_id;
  end if;

  insert into public.transactions (kind, amount, room_id, session_id, created_by)
    values ('SESSION', v_amount, v_session.room_id, v_session.id, auth.uid());

  perform public.sync_room_status(v_session.room_id);
  return v_session;
end;
$$;
