import { getSupabase } from "./supabase";

export async function fetchOrders() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("orders")
    .select("*, rooms(name), sessions(start_time), order_items(*, inventory_items(name))")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function createOrder({ roomId, sessionId, items }) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("create_order", {
    p_room_id: roomId,
    p_session_id: sessionId || null,
    p_items: items.map((item) => ({
      inventory_item_id: item.inventoryItemId,
      quantity: Number(item.quantity),
    })),
  });

  if (error) throw error;
  return data;
}
