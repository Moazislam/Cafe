import { getSupabase } from "./supabase";

export async function fetchVipPurchases() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("vip_purchases")
    .select("*, profiles(username), vip_purchase_items(*)")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function createVipPurchase({ customerName, items, amount, purchaseItems }) {
  const supabase = getSupabase();
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("vip_purchases")
    .insert({ customer_name: customerName.trim(), items: items.trim(), amount: Number(amount), created_by: userData.user.id })
    .select()
    .single();

  if (error) throw error;
  const { error: itemsError } = await supabase.from("vip_purchase_items").insert(
    purchaseItems.map((item) => ({ purchase_id: data.id, item_name: item.name, quantity: item.quantity, unit_price: Number(item.price) })),
  );
  if (itemsError) throw itemsError;
  const { error: transactionError } = await supabase.rpc("record_vip_transaction", { p_purchase_id: data.id });
  if (transactionError) throw transactionError;
  return data;
}

export async function setVipPurchaseItemPaid(id, paid) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("mark_vip_purchase_item_paid", { p_item_id: id, p_paid: paid });
  if (error) throw error;
  return data;
}

export async function adjustVipInventory(itemId, delta) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("adjust_inventory_stock", {
    p_item_id: itemId,
    p_delta: delta,
  });
  if (error) throw error;
  return data;
}