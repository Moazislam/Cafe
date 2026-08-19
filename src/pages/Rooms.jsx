import { useNavigate, useOutletContext } from "react-router-dom";
import { RoomGrid } from "../components/RoomGrid";
import { endSession, startSession } from "../services/sessions";
import { updateRoomStatus } from "../services/rooms";

export function Rooms() {
  const cafe = useOutletContext();
  const navigate = useNavigate();

  async function begin(roomId, reservationId) { try { await startSession({ roomId, durationMinutes: 120, reservationId }); await cafe.refresh(); } catch (error) { window.alert(error.message || "Could not start the session."); } }
  async function finish(sessionId) { try { await endSession(sessionId); await cafe.refresh(); } catch (error) { window.alert(error.message || "Could not end the session."); } }
  async function changeStatus(roomId, status) { try { await updateRoomStatus(roomId, status); await cafe.refresh(); } catch (error) { window.alert(error.message || "Could not update the room."); } }

  return <div className="page-stack"><section className="page-heading"><div><span className="eyebrow">Station control</span><h1>Rooms</h1><p>Manage availability, maintenance, and active gaming sessions.</p></div></section><RoomGrid {...cafe} onStart={begin} onEnd={finish} onReserve={(roomId) => navigate(`/reservations?room=${roomId}`)} onStatusChange={changeStatus} /></div>;
}
