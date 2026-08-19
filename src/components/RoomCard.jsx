import { CalendarPlus, CircleStop, Play } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import { durationFrom, time } from "../utils";

export function RoomCard({ room, activeSessions, reservations, onStart, onEnd, onReserve, onStatusChange }) {
  const session = activeSessions.find((item) => item.room_id === room.id);
  const reservation = reservations.find((item) => item.room_id === room.id && item.status === "CONFIRMED");
  const canStart = room.status === "AVAILABLE";

  return (
    <article className={`room-card room-${room.status.toLowerCase()}`}>
      <div className="room-card-header">
        <div>
          <p className="room-kicker">{room.console_type || "Gaming station"}</p>
          <h3>{room.name}</h3>
        </div>
        <StatusBadge status={room.status} />
      </div>
      <div className="room-details">
        {session ? (
          <p><span>Active for</span><strong>{durationFrom(session.start_time)}</strong></p>
        ) : reservation ? (
          <p><span>Next booking</span><strong>{time(reservation.start_time)}</strong></p>
        ) : (
          <p><span>Rate</span><strong>{room.hourly_rate || 0} EGP/hr</strong></p>
        )}
      </div>
      <div className="room-actions">
        {session ? (
          <button className="button danger-button" type="button" onClick={() => onEnd(session.id)}>
            <CircleStop size={16} /> End session
          </button>
        ) : (
          <button className="button primary-button" type="button" disabled={!canStart} onClick={() => onStart(room.id)}>
            <Play size={16} fill="currentColor" /> Start session
          </button>
        )}
        <button className="icon-button bordered" type="button" title="Create reservation" aria-label={`Create reservation for ${room.name}`} onClick={() => onReserve(room.id)}>
          <CalendarPlus size={18} />
        </button>
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
