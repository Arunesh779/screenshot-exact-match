import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Product = Tables<"products">;
export const CATEGORIES = ["Electronics", "Fashion", "Home", "Accessories"] as const;
export type Category = (typeof CATEGORIES)[number];

export const productsQuery = () =>
  queryOptions({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").order("id");
      if (error) throw new Error("Could not load products");
      return data;
    },
  });

export const productQuery = (id: string) =>
  queryOptions({
    queryKey: ["products", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").eq("id", id).maybeSingle();
      if (error) throw new Error("Could not load product");
      return data;
    },
  });

export type ProductFilters = {
  q?: string;
  category?: string;
  min?: number;
  max?: number;
  sort?: "price-asc" | "price-desc" | "default";
};

export function filterProducts(list: Product[], f: ProductFilters) {
  const q = (f.q ?? "").trim().toLowerCase();
  let out = list.filter((p) => {
    if (q && !`${p.name} ${p.description}`.toLowerCase().includes(q)) return false;
    if (f.category && p.category !== f.category) return false;
    if (f.min != null && Number(p.price) < f.min) return false;
    if (f.max != null && Number(p.price) > f.max) return false;
    return true;
  });
  if (f.sort === "price-asc") out = [...out].sort((a, b) => Number(a.price) - Number(b.price));
  if (f.sort === "price-desc") out = [...out].sort((a, b) => Number(b.price) - Number(a.price));
  return out;
}
