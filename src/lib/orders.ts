import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const ORDER_STATUSES = ["pending", "paid", "shipped", "delivered", "cancelled"] as const;

export const myOrdersQuery = (userId: string) =>
  queryOptions({
    queryKey: ["orders", "mine", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw new Error("Could not load orders");
      return data;
    },
  });

export const orderQuery = (id: string) =>
  queryOptions({
    queryKey: ["orders", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("*, order_items(*)").eq("id", id).maybeSingle();
      if (error) throw new Error("Could not load order");
      return data;
    },
  });
