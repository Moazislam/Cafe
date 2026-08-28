import { useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { CheckoutDialog } from "../components/CheckoutDialog";
import { RoomGrid } from "../components/RoomGrid";
import { SessionModeDialog } from "../components/SessionModeDialog";
import { useCheckout } from "../hooks/useCheckout";
import { cancelSession, startSession } from "../services/sessions";
import { updateRoomStatus } from "../services/rooms";

export function Rooms() {
  const cafe = useOutletContext();
  const navigate = useNavigate();
  const checkout = useCheckout(cafe);
  const [roomModes, setRoomModes] = useState({});
  const [startRequest, setStartRequest] = useState(null);

  function setMode(roomId, mode) {
    setRoomModes((current) => ({ ...current, [roomId]: mode || "SINGLE" }));
  }

  function requestStart(roomId, reservationId, roomMode = "SINGLE") {
    setStartRequest({ roomId, reservationId, roomMode, sessionMode: "OPEN" });
  }

  async function begin() {
    const { roomId, reservationId, roomMode, sessionMode } = startRequest;
    setMode(roomId, roomMode);
    const durationMinutes = sessionMode === "1_HOUR" ? 60 : sessionMode === "2_HOURS" ? 120 : null;
    try { await startSession({ roomId, durationMinutes, reservationId, roomMode }); setStartRequest(null); await cafe.refresh(); } catch (error) { window.alert(error.message || "Could not start the session."); }
  }
  async function changeStatus(roomId, status) { try { await updateRoomStatus(roomId, status); await cafe.refresh(); } catch (error) { window.alert(error.message || "Could not update the room."); } }
  async function cancelActiveSession(sessionId) {
    if (!window.confirm("Cancel this session without charging room time?")) return;
    try { await cancelSession(sessionId); await cafe.refresh(); } catch (error) { window.alert(error.message || "Could not cancel the session."); }
  }

  return (
    <div className="page-stack">
      <section className="page-heading"><div><span className="eyebrow">Station control</span><h1>Rooms</h1><p>Manage availability, maintenance, and active gaming sessions.</p></div></section>
      <RoomGrid
        {...cafe}
        roomModes={roomModes}
        onModeChange={setMode}
        onStart={requestStart}
        onEnd={checkout.openCheckout}
        onCancel={cancelActiveSession}
        onReserve={(roomId) => navigate(`/reservations?room=${roomId}`)}
        onStatusChange={changeStatus}
      />
      {startRequest ? <SessionModeDialog room={cafe.rooms.find((room) => room.id === startRequest.roomId)} mode={startRequest.sessionMode} onChange={(sessionMode) => setStartRequest((current) => ({ ...current, sessionMode }))} onConfirm={begin} onCancel={() => setStartRequest(null)} /> : null}
      {checkout.checkoutSession ? (
        <CheckoutDialog
          room={checkout.checkoutRoom}
          roomMode={checkout.checkoutSession.room_mode}
          session={checkout.checkoutSession}
          orders={checkout.checkoutOrders}
          confirming={checkout.closing}
          onConfirm={checkout.confirmCheckout}
          onCancel={checkout.closeCheckout}
        />
      ) : null}
    </div>
  );
}
