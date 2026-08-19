import { useEffect } from "react";
import { supabase } from "../services/supabase";

const TABLES = ["rooms", "reservations", "sessions", "inventory_items", "orders", "order_items"];

export function useRealtime(onChange) {
  useEffect(() => {
    const channel = supabase.channel("cafe-v1-realtime");

    TABLES.forEach((table) => {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => onChange(),
      );
    });

    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [onChange]);
}
