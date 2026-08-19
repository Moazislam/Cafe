import { getSupabase } from "./supabase";

export async function fetchRooms() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("rooms")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function updateRoomStatus(roomId, status) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("rooms")
    .update({ status })
    .eq("id", roomId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
