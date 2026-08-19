import { useNavigate, useOutletContext } from "react-router-dom";
import { CheckoutDialog } from "../components/CheckoutDialog";
import { RoomGrid } from "../components/RoomGrid";
import { useCheckout } from "../hooks/useCheckout";
import { startSession } from "../services/sessions";
import { updateRoomStatus } from "../services/rooms";

export function Rooms() {
  const cafe = useOutletContext();
  const navigate = useNavigate();
  const checkout = useCheckout(cafe);

  async function begin(roomId, reservationId) { try { await startSession({ roomId, durationMinutes: 120, reservationId }); await cafe.refresh(); } catch (error) { window.alert(error.message || "Could not start the session."); } }
  async function changeStatus(roomId, status) { try { await updateRoomStatus(roomId, status); await cafe.refresh(); } catch (error) { window.alert(error.message || "Could not update the room."); } }

  return (
    <div className="page-stack">
      <section className="page-heading"><div><span className="eyebrow">Station control</span><h1>Rooms</h1><p>Manage availability, maintenance, and active gaming sessions.</p></div></section>
      <RoomGrid {...cafe} onStart={begin} onEnd={checkout.openCheckout} onReserve={(roomId) => navigate(`/reservations?room=${roomId}`)} onStatusChange={changeStatus} />
      {checkout.checkoutSession ? (
        <CheckoutDialog
          room={checkout.checkoutRoom}
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
