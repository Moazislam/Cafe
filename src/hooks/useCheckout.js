import { useState } from "react";
import { endSession } from "../services/sessions";

export function useCheckout(cafe) {
  const [checkoutSessionId, setCheckoutSessionId] = useState(null);
  const [closing, setClosing] = useState(false);

  const checkoutSession = checkoutSessionId
    ? cafe.sessions.find((session) => session.id === checkoutSessionId)
    : null;
  const checkoutRoom = checkoutSession
    ? cafe.rooms.find((room) => room.id === checkoutSession.room_id)
    : null;
  const checkoutOrders = checkoutSession
    ? cafe.orders.filter((order) => order.session_id === checkoutSession.id)
    : [];

  function openCheckout(sessionId) {
    setCheckoutSessionId(sessionId);
  }

  function closeCheckout() {
    if (closing) return;
    setCheckoutSessionId(null);
  }

  async function confirmCheckout() {
    if (!checkoutSessionId) return;
    setClosing(true);
    try {
      await endSession(checkoutSessionId);
      await cafe.refresh();
      setCheckoutSessionId(null);
    } catch (error) {
      window.alert(error.message || "Could not end the session.");
    } finally {
      setClosing(false);
    }
  }

  return { checkoutSession, checkoutRoom, checkoutOrders, closing, openCheckout, closeCheckout, confirmCheckout };
}
