import { getSupabase } from "./supabase";

export async function fetchTransactions(limit = 100) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("transactions")
    .select("*, rooms(name)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
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
