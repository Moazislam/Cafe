-- Persist the selected play mode so navigation cannot change session billing.
alter table public.sessions
  add column if not exists room_mode text not null default 'SINGLE'
  check (room_mode in ('SINGLE', 'MULTIPLAYER'));

-- Replace the old RPC signature so the selected mode is stored at session start.
drop function if exists public.start_session(uuid, integer, uuid);

create or replace function public.start_session(
  p_room_id uuid,
  p_duration_minutes integer,
  p_reservation_id uuid default null,
  p_room_mode text default 'SINGLE'
)
returns public.sessions
language plpgsql
security definer set search_path = public
as $$
declare
  v_room public.rooms;
  v_reservation public.reservations;
  v_session public.sessions;
begin
  if not public.is_operator() then raise exception 'Not authorized'; end if;
  if p_duration_minutes is not null and p_duration_minutes <= 0 then
    raise exception 'Duration must be greater than zero';
  end if;
  if p_room_mode not in ('SINGLE', 'MULTIPLAYER') then
    raise exception 'Invalid room mode';
  end if;

  select * into v_room from public.rooms where id = p_room_id for update;
  if not found then raise exception 'Room not found'; end if;
  if v_room.status in ('OCCUPIED', 'MAINTENANCE') then raise exception 'Room is not available'; end if;

  if p_reservation_id is not null then
    select * into v_reservation from public.reservations where id = p_reservation_id for update;
    if not found or v_reservation.room_id <> p_room_id or v_reservation.status <> 'CONFIRMED' then
      raise exception 'Reservation cannot be used to start this session';
    end if;
    if now() < v_reservation.start_time or now() >= v_reservation.end_time then
      raise exception 'Reservation is not currently active';
    end if;
  elsif exists (
    select 1 from public.reservations
    where room_id = p_room_id and status in ('CONFIRMED', 'ACTIVE')
      and (
        (p_duration_minutes is null and end_time > now())
        or (p_duration_minutes is not null
          and tstzrange(start_time, end_time, '[)') && tstzrange(now(), now() + make_interval(mins => p_duration_minutes), '[)'))
      )
  ) then
    raise exception 'Room has a conflicting reservation';
  end if;

  insert into public.sessions (room_id, reservation_id, expected_end_time, room_mode, status, started_by)
  values (
    p_room_id,
    p_reservation_id,
    case when p_duration_minutes is null then null else now() + make_interval(mins => p_duration_minutes) end,
    p_room_mode,
    'ACTIVE',
    auth.uid()
  )
  returning * into v_session;

  if p_reservation_id is not null then
    update public.reservations set status = 'ACTIVE' where id = p_reservation_id;
  end if;
  update public.rooms set status = 'OCCUPIED' where id = p_room_id;
  return v_session;
end;
$$;

revoke all on function public.start_session(uuid, integer, uuid, text) from public;
grant execute on function public.start_session(uuid, integer, uuid, text) to authenticated;

-- Apply the multiplayer surcharge when recording room-time revenue.
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
    + case when v_session.room_mode = 'MULTIPLAYER'
      then case when v_room.name = 'Room 2' then 15 else 10 end
      else 0
      end;
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

revoke all on function public.end_session(uuid) from public;
grant execute on function public.end_session(uuid) to authenticated;
