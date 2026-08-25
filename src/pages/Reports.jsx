import { CalendarRange, Coins, Receipt, Timer } from "lucide-react";
import { useOutletContext } from "react-router-dom";
import { currency, dateTime, dayLabel, monthLabel } from "../utils";

const KIND_LABELS = { SESSION: "Room time", ORDER: "Counter order" };

function durationLabel(minutes) {
  const totalMinutes = Math.max(0, Math.round(Number(minutes || 0)));
  const hours = Math.floor(totalMinutes / 60);
  const rest = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

function roomTimeLabel(row) {
  return `${durationLabel(row.billed_session_minutes)} (${durationLabel(row.actual_session_minutes)} actual)`;
}

export function Reports() {
  const cafe = useOutletContext();

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <span className="eyebrow">Money in</span>
          <h1>Revenue &amp; logs</h1>
          <p>Room-time charges and counter orders, rolled up by day and month.</p>
        </div>
      </section>

      <section className="stat-grid">
        <article className="stat-card stat-mint">
          <Coins size={20} />
          <strong>{currency(cafe.todayRevenue)}</strong>
          <span>Today's revenue</span>
        </article>
        <article className="stat-card stat-amber">
          <CalendarRange size={20} />
          <strong>{currency(cafe.monthRevenue)}</strong>
          <span>This month's revenue</span>
        </article>
        <article className="stat-card stat-rose">
          <Timer size={20} />
          <strong>{currency(cafe.dailyRevenue.find((row) => row.day === new Date().toISOString().slice(0, 10))?.session_revenue || 0)}</strong>
          <span>Today's room-time charges</span>
        </article>
        <article className="stat-card stat-violet">
          <Receipt size={20} />
          <strong>{currency(cafe.dailyRevenue.find((row) => row.day === new Date().toISOString().slice(0, 10))?.order_revenue || 0)}</strong>
          <span>Today's counter orders</span>
        </article>
      </section>

      <section className="dashboard-lower">
        <div className="section-surface">
          <div className="section-heading">
            <div>
              <h2>Daily revenue</h2>
              <p>Last {cafe.dailyRevenue.length} days with activity.</p>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Day</th><th>Room Revenue</th><th>Orders</th><th>Total</th></tr></thead>
              <tbody>
                {cafe.dailyRevenue.length ? cafe.dailyRevenue.map((row) => (
                  <tr key={row.day}>
                    <td>{dayLabel(row.day)}</td>
                    <td>{currency(row.session_revenue)}</td>
                    <td>{currency(row.order_revenue)}</td>
                    <td><strong>{currency(row.total_revenue)}</strong></td>
                  </tr>
                )) : (
                  <tr><td colSpan={4}><div className="empty-state">No revenue recorded yet.</div></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="section-surface">
          <div className="section-heading">
            <div>
              <h2>Monthly revenue</h2>
              <p>Last {cafe.monthlyRevenue.length} months with activity.</p>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Month</th><th>Room Revenue</th><th>Orders</th><th>Total</th></tr></thead>
              <tbody>
                {cafe.monthlyRevenue.length ? cafe.monthlyRevenue.map((row) => (
                  <tr key={row.month}>
                    <td>{monthLabel(row.month)}</td>
                    <td>{currency(row.session_revenue)}</td>
                    <td>{currency(row.order_revenue)}</td>
                    <td><strong>{currency(row.total_revenue)}</strong></td>
                  </tr>
                )) : (
                  <tr><td colSpan={4}><div className="empty-state">No revenue recorded yet.</div></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="section-surface">
        <div className="section-heading">
          <div>
            <h2>Transaction log</h2>
            <p>{cafe.transactions.length} most recent charges.</p>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>When</th><th>Type</th><th>Room</th>{cafe.role === "ADMIN" ? <th>User</th> : null}<th>Amount</th></tr></thead>
            <tbody>
              {cafe.transactions.length ? cafe.transactions.map((entry) => (
                <tr key={entry.id}>
                  <td>{dateTime(entry.created_at)}</td>
                  <td>{KIND_LABELS[entry.kind] || entry.kind}</td>
                  <td>{entry.rooms?.name || "—"}</td>
                  {cafe.role === "ADMIN" ? <td>{entry.kind === "SESSION" ? entry.sessions?.profiles?.username : entry.profiles?.username || "Unknown"}</td> : null}
                  <td><strong>{currency(entry.amount)}</strong></td>
                </tr>
              )) : (
                <tr><td colSpan={cafe.role === "ADMIN" ? 5 : 4}><div className="empty-state">No transactions logged yet.</div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
