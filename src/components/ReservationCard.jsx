import { CalendarX2, Phone } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import { time } from "../utils";

export function ReservationCard({ reservation, onCancel }) {
  return (
    <article className="reservation-card">
      <div className="reservation-header">
        <div>
          <span className="room-kicker">{reservation.rooms?.name || "Room"}</span>
          <h3>{reservation.customer_name}</h3>
        </div>
        <StatusBadge status={reservation.status} />
      </div>
      <p className="reservation-time">{time(reservation.start_time)} - {time(reservation.end_time)}</p>
      {reservation.customer_phone ? <p className="muted-line"><Phone size={14} />{reservation.customer_phone}</p> : null}
      {reservation.status === "CONFIRMED" ? (
        <button className="text-action" type="button" onClick={() => onCancel(reservation.id)}>
          <CalendarX2 size={16} /> Cancel reservation
        </button>
      ) : null}
    </article>
  );
}
