-- Room 2 uses the same 10 EGP multiplayer surcharge as every other room.
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
  v_hourly_rate numeric;
  v_amount numeric(10, 2);
begin
  if not public.is_operator() then raise exception 'Not authorized'; end if;
  select * into v_session from public.sessions where id = p_session_id for update;
  if not found or v_session.status <> 'ACTIVE' then raise exception 'Active session not found'; end if;

  select * into v_room from public.rooms where id = v_session.room_id;
  v_elapsed_minutes := greatest(0, extract(epoch from (now() - v_session.start_time)) / 60.0);
  v_billable_minutes := greatest(60, round(v_elapsed_minutes / 15.0) * 15);
  v_hourly_rate := coalesce(v_room.hourly_rate, 0)
    + case when v_session.room_mode = 'MULTIPLAYER' then 10 else 0 end;
  v_amount := ceil((v_hourly_rate * (v_billable_minutes / 60.0)) / 5) * 5;

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

-- Correct already-recorded Room 2 multiplayer charges created with the old 15 EGP surcharge.
update public.transactions transaction_log
set amount = ceil((
  (coalesce(room.hourly_rate, 0) + 10)
  * (greatest(60, round(extract(epoch from (session.end_time - session.start_time)) / 900.0) * 15) / 60.0)
) / 5) * 5
from public.sessions session
join public.rooms room on room.id = session.room_id
where transaction_log.kind = 'SESSION'
  and transaction_log.session_id = session.id
  and session.room_mode = 'MULTIPLAYER'
  and room.name = 'Room 2'
  and session.end_time is not null;

update public.sessions session
set amount = transaction_log.amount
from public.transactions transaction_log
join public.rooms room on room.id = transaction_log.room_id
where transaction_log.session_id = session.id
  and transaction_log.kind = 'SESSION'
  and session.room_mode = 'MULTIPLAYER'
  and room.name = 'Room 2'
  and session.end_time is not null;

revoke all on function public.end_session(uuid) from public;
grant execute on function public.end_session(uuid) to authenticated;