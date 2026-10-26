import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { z } from "zod";
import { useState, useEffect } from "react";
import { ProductCard } from "@/components/ProductCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { productsQuery, filterProducts, CATEGORIES } from "@/lib/products";

const searchSchema = z.object({
  q: z.string().max(100).optional().catch(undefined),
  category: z.enum(CATEGORIES).optional().catch(undefined),
  min: z.coerce.number().min(0).optional().catch(undefined),
  max: z.coerce.number().min(0).optional().catch(undefined),
  sort: z.enum(["default", "price-asc", "price-desc"]).optional().catch(undefined),
});

export const Route = createFileRoute("/products/")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "All products — ShopEase" },
      { name: "description", content: "Browse and filter the full ShopEase catalogue by category and price." },
      { property: "og:title", content: "All products — ShopEase" },
      { property: "og:description", content: "Browse and filter the full ShopEase catalogue." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(productsQuery()),
  component: Catalogue,
});

function Catalogue() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/products/" });
  const { data } = useSuspenseQuery(productsQuery());
  const [q, setQ] = useState(search.q ?? "");
  useEffect(() => setQ(search.q ?? ""), [search.q]);
  const results = filterProducts(data, search);
  const set = (patch: Partial<typeof search>) => navigate({ search: (s) => ({ ...s, ...patch }), replace: true });
  const sel = "h-9 w-full rounded-md border border-input bg-card px-3 text-sm";

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-4xl font-bold">Products</h1>
      <form
        className="mt-6 grid gap-4 rounded-xl border bg-card p-4 shadow-card md:grid-cols-6"
        data-testid="filters"
        onSubmit={(e) => {
          e.preventDefault();
          set({ q: q.trim() || undefined });
        }}
      >
        <div className="md:col-span-2">
          <Label htmlFor="f-q">Search</Label>
          <div className="mt-1 flex gap-2">
            <Input id="f-q" data-testid="search-input" value={q} maxLength={100} onChange={(e) => setQ(e.target.value)} placeholder="e.g. headphones" />
            <Button type="submit" data-testid="search-submit">Search</Button>
          </div>
        </div>
        <div>
          <Label htmlFor="f-cat">Category</Label>
          <select id="f-cat" data-testid="category-filter" className={`${sel} mt-1`} value={search.category ?? ""} onChange={(e) => set({ category: (e.target.value || undefined) as never })}>
            <option value="">All</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="f-min">Min price</Label>
          <Input id="f-min" type="number" min={0} data-testid="min-price" className="mt-1" value={search.min ?? ""} onChange={(e) => set({ min: e.target.value === "" ? undefined : Math.max(0, Number(e.target.value)) })} />
        </div>
        <div>
          <Label htmlFor="f-max">Max price</Label>
          <Input id="f-max" type="number" min={0} data-testid="max-price" className="mt-1" value={search.max ?? ""} onChange={(e) => set({ max: e.target.value === "" ? undefined : Math.max(0, Number(e.target.value)) })} />
        </div>
        <div>
          <Label htmlFor="f-sort">Sort</Label>
          <select id="f-sort" data-testid="sort-select" className={`${sel} mt-1`} value={search.sort ?? "default"} onChange={(e) => set({ sort: e.target.value as never })}>
            <option value="default">Featured</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
          </select>
        </div>
      </form>

      <p className="mt-6 text-sm text-muted-foreground" data-testid="result-count">{results.length} product{results.length === 1 ? "" : "s"}</p>
      {results.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed p-12 text-center" data-testid="no-results">
          <p className="font-display text-xl font-semibold">No products match your search</p>
          <p className="mt-1 text-sm text-muted-foreground">Try a different keyword or clear the filters.</p>
          <Button variant="outline" className="mt-4" data-testid="clear-filters" onClick={() => navigate({ search: {}, replace: true })}>Clear filters</Button>
        </div>
      ) : (
        <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-4" data-testid="product-grid">
          {results.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
}
