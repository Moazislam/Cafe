import { Receipt, ShoppingBag, Timer, X } from "lucide-react";
import { currency, durationFrom } from "../utils";

export function CheckoutDialog({ room, session, orders, onConfirm, onCancel, confirming }) {
  const elapsedHours = Math.max(0, (Date.now() - new Date(session.start_time).getTime()) / 3600000);
  const roomCharge = (room?.hourly_rate || 0) * elapsedHours;
  const orderLines = orders.flatMap((order) => (order.order_items || []).map((item) => ({ ...item, orderId: order.id })));
  const ordersTotal = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const grandTotal = roomCharge + ordersTotal;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={`Checkout for ${room?.name || "room"}`}>
      <div className="modal-panel">
        <div className="modal-header">
          <div>
            <span className="eyebrow">Close out</span>
            <h2>{room?.name || "Room"}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onCancel} aria-label="Close checkout" disabled={confirming}>
            <X size={18} />
          </button>
        </div>

        <div className="checkout-lines">
          <div className="checkout-line">
            <span><Timer size={15} /> Room time ({durationFrom(session.start_time)} @ {room?.hourly_rate || 0} EGP/hr)</span>
            <strong>{currency(roomCharge)}</strong>
          </div>
          {orderLines.length ? orderLines.map((item) => (
            <div className="checkout-line" key={item.id}>
              <span><ShoppingBag size={15} /> {item.quantity}x {item.inventory_items?.name || "Item"}</span>
              <strong>{currency(item.unit_price * item.quantity)}</strong>
            </div>
          )) : (
            <div className="checkout-line"><span><Receipt size={15} /> No counter orders on this tab</span></div>
          )}
        </div>

        <div className="checkout-total">
          <span>Total due</span>
          <strong>{currency(grandTotal)}</strong>
        </div>
        <p className="form-message">Room time is billed up to the moment you confirm.</p>

        <div className="checkout-actions">
          <button className="button secondary-button" type="button" onClick={onCancel} disabled={confirming}>Cancel</button>
          <button className="button primary-button" type="button" onClick={onConfirm} disabled={confirming}>
            {confirming ? "Closing..." : "Confirm & end session"}
          </button>
        </div>
      </div>
    </div>
  );
}
