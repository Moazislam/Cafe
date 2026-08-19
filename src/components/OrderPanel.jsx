import { Minus, Plus, ShoppingBag } from "lucide-react";
import { useMemo, useState } from "react";
import { createOrder } from "../services/orders";
import { currency } from "../utils";

export function OrderPanel({ inventory, activeSessions, onComplete }) {
  const [sessionId, setSessionId] = useState("");
  const [quantities, setQuantities] = useState({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const cart = useMemo(() => inventory.filter((item) => quantities[item.id] > 0), [inventory, quantities]);
  const total = cart.reduce((sum, item) => sum + item.price * quantities[item.id], 0);

  function changeQuantity(item, nextValue) {
    const quantity = Math.min(item.quantity, Math.max(0, Number(nextValue) || 0));
    setQuantities((current) => ({ ...current, [item.id]: quantity }));
  }

  async function submit(event) {
    event.preventDefault();
    if (!cart.length) {
      setMessage("Add at least one item to the order.");
      return;
    }

    const session = sessionId ? activeSessions.find((item) => item.id === sessionId) : null;
    setSaving(true);
    setMessage("");
    try {
      await createOrder({
        roomId: session ? session.room_id : null,
        sessionId: session ? session.id : null,
        items: cart.map((item) => ({ inventoryItemId: item.id, quantity: quantities[item.id] })),
      });
      setQuantities({});
      setSessionId("");
      setMessage("Order added and inventory updated.");
      await onComplete();
    } catch (error) {
      setMessage(error.message || "Could not create the order.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="order-panel" onSubmit={submit}>
      <div className="field-group">
        <label htmlFor="order-session">Assign to room (optional)</label>
        <select id="order-session" value={sessionId} onChange={(event) => setSessionId(event.target.value)}>
          <option value="">Counter sale (no room)</option>
          {activeSessions.map((session) => <option key={session.id} value={session.id}>{session.rooms?.name || "Room"}</option>)}
        </select>
      </div>
      <div className="order-items">
        {inventory.map((item) => (
          <div className="order-item" key={item.id}>
            <div><strong>{item.name}</strong><span>{currency(item.price)} · {item.quantity} left</span></div>
            <div className="quantity-control">
              <button type="button" className="icon-button bordered" title={`Decrease ${item.name}`} aria-label={`Decrease ${item.name}`} onClick={() => changeQuantity(item, (quantities[item.id] || 0) - 1)}><Minus size={14} /></button>
              <output>{quantities[item.id] || 0}</output>
              <button type="button" className="icon-button bordered" title={`Increase ${item.name}`} aria-label={`Increase ${item.name}`} disabled={item.quantity === 0} onClick={() => changeQuantity(item, (quantities[item.id] || 0) + 1)}><Plus size={14} /></button>
            </div>
          </div>
        ))}
      </div>
      <div className="order-footer"><span>Total</span><strong>{currency(total)}</strong></div>
      <button className="button primary-button full-button" type="submit" disabled={saving || !cart.length}><ShoppingBag size={17} />{saving ? "Adding order..." : "Add order"}</button>
      {message ? <p className="form-message">{message}</p> : null}
    </form>
  );
}
