import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchInventory } from "../services/inventory";
import { fetchOrders } from "../services/orders";
import { fetchReservations } from "../services/reservations";
import { fetchRooms } from "../services/rooms";
import { fetchDailyRevenue, fetchMonthlyRevenue, fetchTransactions } from "../services/revenue";
import { fetchSessions } from "../services/sessions";
import { useRealtime } from "./useRealtime";

export function useCafeData() {
  const [rooms, setRooms] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [orders, setOrders] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [dailyRevenue, setDailyRevenue] = useState([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      setError("");
      const [
        roomData,
        reservationData,
        sessionData,
        inventoryData,
        orderData,
        transactionData,
        dailyRevenueData,
        monthlyRevenueData,
      ] = await Promise.all([
        fetchRooms(),
        fetchReservations(),
        fetchSessions(),
        fetchInventory(),
        fetchOrders(),
        fetchTransactions(),
        fetchDailyRevenue(),
        fetchMonthlyRevenue(),
      ]);
      setRooms(roomData);
      setReservations(reservationData);
      setSessions(sessionData);
      setInventory(inventoryData);
      setOrders(orderData);
      setTransactions(transactionData);
      setDailyRevenue(dailyRevenueData);
      setMonthlyRevenue(monthlyRevenueData);
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

  const todayRevenue = useMemo(() => {
    const todayKey = new Date().toISOString().slice(0, 10);
    const row = dailyRevenue.find((entry) => entry.day === todayKey);
    return Number(row?.total_revenue || 0);
  }, [dailyRevenue]);

  const monthRevenue = useMemo(() => {
    const monthKey = `${new Date().toISOString().slice(0, 7)}-01`;
    const row = monthlyRevenue.find((entry) => entry.month === monthKey);
    return Number(row?.total_revenue || 0);
  }, [monthlyRevenue]);

  return {
    rooms,
    reservations,
    sessions,
    activeSessions,
    openReservations,
    inventory,
    lowStock,
    orders,
    transactions,
    dailyRevenue,
    monthlyRevenue,
    todayRevenue,
    monthRevenue,
    loading,
    error,
    refresh,
  };
}
