import { CalendarPlus, CircleStop, Play, BellRing, XCircle } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import { durationFrom, time } from "../utils";

function getRoomModeRate(room, roomMode = "SINGLE") {
  const baseRate = Number(room?.hourly_rate || 0);
  const surcharge = roomMode === "MULTIPLAYER" ? (room?.id === 2 ? 15 : 10) : 0;
  return baseRate + surcharge;
}

export function RoomCard({ room, roomMode = "SINGLE", activeSessions, reservations, overtimeSessionIds, onStart, onEnd, onCancel, onReserve, onStatusChange, onModeChange }) {
  const now = Date.now();
  const session = activeSessions.find((item) => item.room_id === room.id);
  const effectiveRoomMode = session?.room_mode || roomMode;
  const isOvertime = Boolean(session && overtimeSessionIds?.has(session.id));
  const roomReservations = reservations.filter((item) => item.room_id === room.id && item.status === "CONFIRMED");
  const activeReservation = roomReservations.find(
    (item) => new Date(item.start_time).getTime() <= now && new Date(item.end_time).getTime() > now,
  );
  const reservation = activeReservation || roomReservations[0];
  const canStart = room.status === "AVAILABLE" || Boolean(activeReservation);
  const effectiveRate = getRoomModeRate(room, roomMode);

  return (
    <article className={`room-card room-${room.status.toLowerCase()}${isOvertime ? " room-overtime" : ""}`}>
      <div className="room-card-header">
        <div>
          <p className="room-kicker">{room.console_type || "Gaming station"}</p>
          <h3>{room.name}</h3>
        </div>
        {isOvertime ? (
          <span className="overtime-badge"><BellRing size={16} /> Time's up</span>
        ) : (
          <StatusBadge status={room.status} />
        )}
      </div>
      <div className="room-details">
        {session ? (
          <p className={isOvertime ? "overtime-line" : ""}><span>Active for</span><strong>{durationFrom(session.start_time)}</strong></p>
        ) : activeReservation ? (
          <p><span>Checked-in booking</span><strong>{activeReservation.customer_name}</strong></p>
        ) : reservation ? (
          <p><span>Next booking</span><strong>{time(reservation.start_time)}</strong></p>
        ) : (
          <p><span>Rate</span><strong>{effectiveRate} EGP/hr</strong></p>
        )}
        <p><span>Mode</span><strong>{effectiveRoomMode === "MULTIPLAYER" ? "Multiplayer" : "Single"}</strong></p>
      </div>
      <div className="room-actions">
        {session ? (
          <>
            <button className="button danger-button" type="button" onClick={() => onEnd(session.id)}>
              <CircleStop size={16} /> End session
            </button>
            <button className="button secondary-button" type="button" onClick={() => onCancel(session.id)}>
              <XCircle size={16} /> Cancel session
            </button>
          </>
        ) : (
          <button className="button primary-button" type="button" disabled={!canStart} onClick={() => onStart(room.id, activeReservation?.id, roomMode)}>
            <Play size={16} fill="currentColor" /> {activeReservation ? "Check in" : "Start session"}
          </button>
        )}
        <button className="icon-button bordered" type="button" title="Create reservation" aria-label={`Create reservation for ${room.name}`} onClick={() => onReserve(room.id)}>
          <CalendarPlus size={18} />
        </button>
        {onModeChange ? (
          <select className="compact-select" aria-label={`Set ${room.name} play mode`} value={effectiveRoomMode} onChange={(event) => onModeChange(room.id, event.target.value)}>
            <option value="SINGLE">Single</option>
            <option value="MULTIPLAYER">Multiplayer</option>
          </select>
        ) : null}
        {onStatusChange && !session && ["AVAILABLE", "MAINTENANCE"].includes(room.status) ? (
          <select className="compact-select" aria-label={`Set ${room.name} status`} value={room.status} onChange={(event) => onStatusChange(room.id, event.target.value)}>
            <option value="AVAILABLE">Available</option>
            <option value="MAINTENANCE">Maintenance</option>
          </select>
        ) : null}
      </div>
    </article>
  );
}
