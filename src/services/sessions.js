import { getSupabase } from "./supabase";

export async function fetchSessions() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("sessions")
    .select("*, rooms(name)")
    .order("start_time", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function startSession({ roomId, durationMinutes, reservationId = null }) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("start_session", {
    p_room_id: roomId,
    p_duration_minutes: durationMinutes == null ? null : Number(durationMinutes),
    p_reservation_id: reservationId,
  });

  if (error) throw error;
  return data;
}

export async function endSession(sessionId) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("end_session", {
    p_session_id: sessionId,
  });

  if (error) throw error;
  return data;
}

export async function cancelSession(sessionId) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("cancel_session", {
    p_session_id: sessionId,
  });

  if (error) throw error;
  return data;
}
