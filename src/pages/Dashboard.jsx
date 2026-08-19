import { ArrowUpRight, Boxes, CalendarDays, CircleAlert, Coins, Timer } from "lucide-react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { CheckoutDialog } from "../components/CheckoutDialog";
import { RoomGrid } from "../components/RoomGrid";
import { SessionCard } from "../components/SessionCard";
import { useCheckout } from "../hooks/useCheckout";
import { startSession } from "../services/sessions";
import { currency } from "../utils";

export function Dashboard() {
  const cafe = useOutletContext();
  const navigate = useNavigate();
  const checkout = useCheckout(cafe);

  async function begin(roomId, reservationId) {
    try {
      await startSession({ roomId, durationMinutes: 120, reservationId });
      await cafe.refresh();
    } catch (error) {
      window.alert(error.message || "Could not start the session.");
    }
  }

  const stats = [
    { label: "Available rooms", value: cafe.rooms.filter((room) => room.status === "AVAILABLE").length, icon: Boxes, color: "mint" },
    { label: "Active sessions", value: cafe.activeSessions.length, icon: Timer, color: "amber" },
    { label: "Upcoming bookings", value: cafe.openReservations.length, icon: CalendarDays, color: "rose" },
    { label: "Low stock", value: cafe.lowStock.length, icon: CircleAlert, color: "violet" },
    { label: "Today's revenue", value: currency(cafe.todayRevenue), icon: Coins, color: "mint" },
  ];

  return (
    <div className="page-stack">
      <section className="page-heading"><div><span className="eyebrow">Live operations</span><h1>Cafe overview</h1><p>Room availability, bookings, sessions, and stock at a glance.</p></div><button className="button secondary-button" type="button" onClick={() => cafe.refresh()}><ArrowUpRight size={17} /> Refresh</button></section>
      <section className="stat-grid">{stats.map(({ label, value, icon: Icon, color }) => <article key={label} className={`stat-card stat-${color}`}><Icon size={20} /><strong>{value}</strong><span>{label}</span></article>)}</section>
      <section className="split-section"><div className="section-heading"><div><h2>Room floor</h2><p>Start and stop sessions as rooms change hands.</p></div><button className="text-action" type="button" onClick={() => navigate("/rooms")}>View rooms <ArrowUpRight size={16} /></button></div><RoomGrid {...cafe} onStart={begin} onEnd={checkout.openCheckout} onReserve={(roomId) => navigate(`/reservations?room=${roomId}`)} /></section>
      <section className="dashboard-lower"><div className="section-surface"><div className="section-heading"><div><h2>Sessions in progress</h2><p>Elapsed time updates while you work.</p></div></div><div className="session-list">{cafe.activeSessions.length ? cafe.activeSessions.map((session) => <SessionCard key={session.id} session={session} overtime={cafe.overtimeSessionIds?.has(session.id)} onEnd={checkout.openCheckout} />) : <div className="empty-state">No active sessions right now.</div>}</div></div><div className="section-surface"><div className="section-heading"><div><h2>Stock attention</h2><p>Items at or below their threshold.</p></div><button className="text-action" type="button" onClick={() => navigate("/inventory")}>Inventory <ArrowUpRight size={16} /></button></div><div className="attention-list">{cafe.lowStock.length ? cafe.lowStock.map((item) => <div key={item.id} className="attention-item"><span>{item.name}</span><strong>{item.quantity} left</strong></div>) : <div className="empty-state">Stock levels look good.</div>}</div></div></section>
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
