import { getSupabase } from "./supabase";

export async function fetchTransactions(limit = 100) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("transactions")
    .select("*, rooms(name), profiles(username, role), sessions(started_by, room_mode, profiles(username)), orders(session_id, sessions(room_mode))")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function refundOrder(transactionId) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("refund_order_transaction", {
    p_transaction_id: transactionId,
  });

  if (error) throw error;
  return data;
}

export async function fetchDailyRevenue(limit = 30) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("daily_revenue")
    .select("*")
    .order("day", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function fetchMonthlyRevenue(limit = 12) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("monthly_revenue")
    .select("*")
    .order("month", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}
