import { getSupabase } from "./supabase";

function toUtcISOString(value) {
  return new Date(value).toISOString();
}

export async function fetchReservations() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("reservations")
    .select("*, rooms(name)")
    .order("start_time", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function createReservation(input) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("reservations")
    .insert({
      room_id: input.roomId,
      customer_name: input.customerName,
      customer_phone: input.customerPhone,
      start_time: toUtcISOString(input.startTime),
      end_time: toUtcISOString(input.endTime),
      status: "CONFIRMED",
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function cancelReservation(reservationId) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("cancel_reservation", {
    p_reservation_id: reservationId,
  });

  if (error) throw error;
  return data;
}
