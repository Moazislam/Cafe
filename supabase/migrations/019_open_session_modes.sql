-- Allow sessions to run without an automatic end time.
create or replace function public.start_session(
  p_room_id uuid,
  p_duration_minutes integer,
  p_reservation_id uuid default null
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

  insert into public.sessions (room_id, reservation_id, expected_end_time, status, started_by)
  values (
    p_room_id,
    p_reservation_id,
    case when p_duration_minutes is null then null else now() + make_interval(mins => p_duration_minutes) end,
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
