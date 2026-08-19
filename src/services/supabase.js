import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.");
}

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);
export const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export function getSupabase() {
  if (!supabase) {
    throw new Error("Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to a .env file.");
  }

  return supabase;
}
