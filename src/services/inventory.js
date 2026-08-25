import { getSupabase } from "./supabase";

export async function fetchInventory() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("inventory_items")
    .select("*")
    .eq("active", true)
    .order("name", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function upsertInventoryItem(item) {
  const supabase = getSupabase();
  const payload = {
    name: item.name,
    category: item.category,
    quantity: Number(item.quantity),
    price: Number(item.price),
    low_stock_threshold: Number(item.lowStockThreshold),
    active: true,
  };

  const query = item.id
    ? supabase.from("inventory_items").update(payload).eq("id", item.id)
    : supabase.from("inventory_items").insert(payload);

  const { data, error } = await query.select().single();
  if (error) throw error;
  return data;
}

export async function archiveInventoryItem(itemId) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("archive_inventory_item", { p_item_id: itemId });
  if (error) throw error;
  return data;
}
