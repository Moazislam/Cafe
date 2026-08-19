import { CalendarPlus } from "lucide-react";
import { useMemo, useState } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import { ReservationCard } from "../components/ReservationCard";
import { cancelReservation, createReservation } from "../services/reservations";
import { dateTimeLocal } from "../utils";

function initialTimes() {
  const start = new Date();
  start.setMinutes(start.getMinutes() + 30, 0, 0);
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
  return { startTime: dateTimeLocal(start), endTime: dateTimeLocal(end) };
}

export function Reservations() {
  const cafe = useOutletContext();
  const [searchParams] = useSearchParams();
  const initial = initialTimes();
  const [form, setForm] = useState({ roomId: searchParams.get("room") || "", customerName: "", customerPhone: "", ...initial });
  const [message, setMessage] = useState("");
  const reservations = useMemo(() => cafe.reservations.filter((item) => item.status !== "CANCELLED"), [cafe.reservations]);

  function update(key, value) { setForm((current) => ({ ...current, [key]: value })); }
  async function submit(event) { event.preventDefault(); setMessage(""); try { await createReservation(form); setMessage("Reservation confirmed."); setForm((current) => ({ ...current, customerName: "", customerPhone: "" })); await cafe.refresh(); } catch (error) { setMessage(error.message || "Could not create reservation."); } }
  async function cancel(id) { if (!window.confirm("Cancel this reservation?")) return; try { await cancelReservation(id); await cafe.refresh(); } catch (error) { window.alert(error.message || "Could not cancel reservation."); } }

  return <div className="page-stack"><section className="page-heading"><div><span className="eyebrow">Booking desk</span><h1>Reservations</h1><p>Schedule rooms without double-booking the cafe floor.</p></div></section><section className="reservation-layout"><form className="form-surface" onSubmit={submit}><div className="section-heading"><div><h2>New reservation</h2><p>Conflicting bookings are blocked by the database.</p></div><CalendarPlus size={21} /></div><label>Room<select value={form.roomId} onChange={(event) => update("roomId", event.target.value)} required><option value="">Select a room</option>{cafe.rooms.map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}</select></label><label>Customer name<input value={form.customerName} onChange={(event) => update("customerName", event.target.value)} required /></label><label>Phone number<input value={form.customerPhone} onChange={(event) => update("customerPhone", event.target.value)} /></label><div className="two-fields"><label>Start<input type="datetime-local" value={form.startTime} onChange={(event) => update("startTime", event.target.value)} required /></label><label>End<input type="datetime-local" value={form.endTime} onChange={(event) => update("endTime", event.target.value)} required /></label></div><button className="button primary-button full-button" type="submit"><CalendarPlus size={17} />Confirm reservation</button>{message ? <p className="form-message">{message}</p> : null}</form><div className="reservation-list"><div className="section-heading"><div><h2>Bookings</h2><p>{reservations.length} current and completed records.</p></div></div>{reservations.length ? reservations.map((reservation) => <ReservationCard key={reservation.id} reservation={reservation} onCancel={cancel} />) : <div className="empty-state">No reservations yet.</div>}</div></section></div>;
}
