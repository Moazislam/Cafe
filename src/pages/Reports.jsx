import { CalendarRange, Coins, Receipt, Timer, Undo2 } from "lucide-react";
import { Fragment, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { refundOrder } from "../services/revenue";
import { businessDayKey, currency, dateTime, dateTimeSeconds, dayLabel, monthLabel } from "../utils";

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

function modeLabel(entry) {
  const mode = entry.kind === "SESSION" ? entry.sessions?.room_mode : entry.orders?.sessions?.room_mode;
  return mode === "MULTIPLAYER" ? "M" : mode === "SINGLE" ? "S" : "—";
}

function roomRevenueDetails(entry) {
  if (entry.kind !== "SESSION" || !entry.sessions?.start_time || !entry.sessions?.end_time) return null;

  const start = new Date(entry.sessions.start_time);
  const end = new Date(entry.sessions.end_time);
  const exactSeconds = Math.max(0, (end.getTime() - start.getTime()) / 1000);
  const exactMinutes = exactSeconds / 60;
  const billedMinutes = Math.max(60, Math.round(exactMinutes / 15) * 15);
  const baseRate = Number(entry.rooms?.hourly_rate || 0);
  const surcharge = entry.sessions.room_mode === "MULTIPLAYER" ? 10 : 0;
  const effectiveRate = baseRate + surcharge;
  const exactCost = effectiveRate * (billedMinutes / 60);
  const finalCost = Math.ceil(exactCost / 5) * 5;

  return { start, end, exactSeconds, exactMinutes, billedMinutes, baseRate, surcharge, effectiveRate, exactCost, finalCost };
}

function debugNumber(value) {
  return Number(value).toFixed(6);
}

export function Reports() {
  const cafe = useOutletContext();
  const isAdmin = String(cafe.role || "").trim().toUpperCase() === "ADMIN";
  const [refundingId, setRefundingId] = useState("");
  const [refundError, setRefundError] = useState("");
  const [expandedTransactionId, setExpandedTransactionId] = useState("");

  async function handleRefund(entry) {
    if (!window.confirm("Return this counter order and restore its inventory?")) return;

    setRefundingId(entry.id);
    setRefundError("");
    try {
      await refundOrder(entry.id);
      await cafe.refresh();
    } catch (error) {
      setRefundError(error.message || "Could not undo this order.");
    } finally {
      setRefundingId("");
    }
  }

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
        {isAdmin ? (
          <article className="stat-card stat-amber">
            <CalendarRange size={20} />
            <strong>{currency(cafe.monthRevenue)}</strong>
            <span>This month's revenue</span>
          </article>
        ) : null}
        <article className="stat-card stat-rose">
          <Timer size={20} />
          <strong>{currency(cafe.dailyRevenue.find((row) => row.day === businessDayKey())?.session_revenue || 0)}</strong>
          <span>Today's room-time charges</span>
        </article>
        <article className="stat-card stat-violet">
          <Receipt size={20} />
          <strong>{currency(cafe.dailyRevenue.find((row) => row.day === businessDayKey())?.order_revenue || 0)}</strong>
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

        {isAdmin ? (
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
        ) : null}
      </section>

      <section className="section-surface">
        <div className="section-heading">
          <div>
            <h2>Transaction log</h2>
            <p>{cafe.transactions.length} most recent charges.</p>
          </div>
        </div>
        {refundError ? <div className="form-error">{refundError}</div> : null}
        <div className="table-wrap">
          <table>
            <thead><tr><th>When</th><th>Type</th><th>Room</th><th>Mode</th>{isAdmin ? <th>User</th> : null}<th>Amount</th><th aria-label="Actions" /></tr></thead>
            <tbody>
              {cafe.transactions.length ? cafe.transactions.map((entry) => {
                const details = roomRevenueDetails(entry);
                const expanded = expandedTransactionId === entry.id;
                return (
                  <Fragment key={entry.id}>
                    <tr
                      onClick={() => details && setExpandedTransactionId(expanded ? "" : entry.id)}
                      onKeyDown={(event) => {
                        if (details && (event.key === "Enter" || event.key === " ")) {
                          event.preventDefault();
                          setExpandedTransactionId(expanded ? "" : entry.id);
                        }
                      }}
                      tabIndex={details ? 0 : undefined}
                      aria-expanded={details ? expanded : undefined}
                      title={details ? "Show room revenue details" : undefined}
                    >
                      <td>{dateTime(entry.created_at)}</td>
                      <td>{KIND_LABELS[entry.kind] || entry.kind}</td>
                      <td>{entry.rooms?.name || "—"}</td>
                      <td>{modeLabel(entry)}</td>
                      {isAdmin ? <td>{entry.kind === "SESSION" ? entry.sessions?.profiles?.username : entry.profiles?.username || "Unknown"}</td> : null}
                      <td><strong>{currency(entry.amount)}</strong></td>
                      <td>{entry.kind === "ORDER" && !entry.refund_of && !entry.refunded_at ? <button className="icon-button bordered" type="button" title="Undo counter order" aria-label="Undo counter order" disabled={refundingId === entry.id} onClick={(event) => { event.stopPropagation(); handleRefund(entry); }}><Undo2 size={16} /></button> : null}</td>
                    </tr>
                    {expanded && details ? (
                      <tr className="revenue-debug-row">
                        <td colSpan={isAdmin ? 7 : 6}>
                          <div className="revenue-debug">
                            <strong>Room revenue calculation</strong>
                            <span>Start (Cairo): {dateTimeSeconds(details.start)}</span>
                            <span>End (Cairo): {dateTimeSeconds(details.end)}</span>
                            <span>Exact elapsed: {debugNumber(details.exactSeconds)} seconds ({debugNumber(details.exactMinutes)} minutes)</span>
                            <span>After quarter-hour rounding: {details.billedMinutes} minutes (minimum 60)</span>
                            <span>Rate: {debugNumber(details.baseRate)} + {debugNumber(details.surcharge)} surcharge = {debugNumber(details.effectiveRate)} EGP/hour</span>
                            <span>Exact cost before ceiling: {debugNumber(details.exactCost)} EGP</span>
                            <span>After ceiling to 5 EGP: {debugNumber(details.finalCost)} EGP</span>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              }) : (
                <tr><td colSpan={isAdmin ? 7 : 6}><div className="empty-state">No transactions logged yet.</div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
