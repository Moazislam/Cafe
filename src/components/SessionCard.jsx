import { BellRing, CircleStop, Timer } from "lucide-react";
import { durationFrom, time } from "../utils";

export function SessionCard({ session, overtime, onEnd }) {
  return (
    <article className={`session-card${overtime ? " session-overtime" : ""}`}>
      <div>
        <span className="room-kicker">{session.rooms?.name || "Room"}</span>
        <h3>{durationFrom(session.start_time)}</h3>
        <p>{overtime ? "Booked time is up" : `Started ${time(session.start_time)}`}</p>
      </div>
      <div className="session-card-actions">
        {overtime ? <BellRing size={21} /> : <Timer size={21} />}
        <button className="icon-button bordered" type="button" title="End session" aria-label={`End ${session.rooms?.name || "room"} session`} onClick={() => onEnd(session.id)}>
          <CircleStop size={18} />
        </button>
      </div>
    </article>
  );
}
