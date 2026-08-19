import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchInventory } from "../services/inventory";
import { fetchOrders } from "../services/orders";
import { fetchReservations } from "../services/reservations";
import { fetchRooms } from "../services/rooms";
import { fetchSessions } from "../services/sessions";
import { useRealtime } from "./useRealtime";

export function useCafeData() {
  const [rooms, setRooms] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      setError("");
      const [roomData, reservationData, sessionData, inventoryData, orderData] = await Promise.all([
        fetchRooms(),
        fetchReservations(),
        fetchSessions(),
        fetchInventory(),
        fetchOrders(),
      ]);
      setRooms(roomData);
      setReservations(reservationData);
      setSessions(sessionData);
      setInventory(inventoryData);
      setOrders(orderData);
    } catch (err) {
      setError(err.message || "Could not load cafe data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useRealtime(refresh);

  const activeSessions = useMemo(
    () => sessions.filter((session) => session.status === "ACTIVE"),
    [sessions],
  );

  const openReservations = useMemo(
    () => reservations.filter((reservation) => ["CONFIRMED", "ACTIVE"].includes(reservation.status)),
    [reservations],
  );

  const lowStock = useMemo(
    () => inventory.filter((item) => item.quantity <= item.low_stock_threshold),
    [inventory],
  );

  return {
    rooms,
    reservations,
    sessions,
    activeSessions,
    openReservations,
    inventory,
    lowStock,
    orders,
    loading,
    error,
    refresh,
  };
}
