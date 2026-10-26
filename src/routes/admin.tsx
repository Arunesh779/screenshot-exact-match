import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { RequireAuth } from "@/components/RequireAuth";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { productsQuery, CATEGORIES, type Product } from "@/lib/products";
import { ORDER_STATUSES } from "@/lib/orders";
import { formatPrice } from "@/lib/pricing";

export const LOW_STOCK = 5;

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — ShopEase" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <RequireAuth message="Sign in with an administrator account.">
      <AdminGate />
    </RequireAuth>
  ),
});

function AdminGate() {
  const { isAdmin } = useAuth();
  if (!isAdmin)
    return (
      <div className="px-4 py-24 text-center" data-testid="admin-forbidden">
        <h1 className="text-3xl font-bold">Access denied</h1>
        <p className="mt-2 text-muted-foreground">You need administrator access to view this page.</p>
      </div>
    );
  return <Admin />;
}

const productSchema = z.object({
  id: z.string().trim().regex(/^[A-Za-z0-9-]{2,20}$/, "ID: 2–20 letters, digits or dashes"),
  name: z.string().trim().min(1, "Name is required").max(120),
  description: z.string().trim().max(2000),
  category: z.enum(CATEGORIES),
  price: z.coerce.number().min(0, "Price must be 0 or more").max(100000),
  stock: z.coerce.number().int("Stock must be a whole number").min(0).max(100000),
  rating: z.coerce.number().min(0).max(5),
  image_url: z.string().trim().url("Enter a valid URL").max(500).or(z.literal("")).transform((v) => v || null),
});

const ordersQuery = { queryKey: ["orders", "all"], queryFn: async () => {
  const { data, error } = await supabase.from("orders").select("*, order_items(*)").order("created_at", { ascending: false });
  if (error) throw new Error("Could not load orders");
  return data;
} };

function Admin() {
  const qc = useQueryClient();
  const products = useQuery(productsQuery());
  const orders = useQuery(ordersQuery);
  const [editing, setEditing] = useState<Product | "new" | null>(null);

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw new Error("Delete failed");
    },
    onSuccess: () => { toast.success("Product deleted"); qc.invalidateQueries({ queryKey: ["products"] }); },
    onError: (e) => toast.error(e.message),
  });
  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: (typeof ORDER_STATUSES)[number] }) => {
      const { error } = await supabase.from("orders").update({ status }).eq("id", id);
      if (error) throw new Error("Status update failed");
    },
    onSuccess: () => { toast.success("Order status updated"); qc.invalidateQueries({ queryKey: ["orders"] }); },
    onError: (e) => toast.error(e.message),
  });

  const validOrders = orders.data?.filter((o) => o.status !== "cancelled") ?? [];
  const revenue = validOrders.reduce((s, o) => s + Number(o.total), 0);
  const low = products.data?.filter((p) => p.stock <= LOW_STOCK) ?? [];

  return (
    <div className="mx-auto max-w-7xl space-y-10 px-4 py-10" data-testid="admin-dashboard">
      <h1 className="text-4xl font-bold">Admin dashboard</h1>

      <section className="grid gap-4 sm:grid-cols-4" aria-label="Sales summary">
        {[
          ["Revenue", formatPrice(revenue), "stat-revenue"],
          ["Orders", String(validOrders.length), "stat-orders"],
          ["Avg. order", formatPrice(validOrders.length ? revenue / validOrders.length : 0), "stat-aov"],
          ["Products", String(products.data?.length ?? 0), "stat-products"],
        ].map(([l, v, t]) => (
          <div key={t} className="rounded-xl border bg-card p-5 shadow-card"><p className="text-sm text-muted-foreground">{l}</p><p className="mt-1 font-display text-2xl font-bold" data-testid={t}>{v}</p></div>
        ))}
      </section>

      {low.length > 0 && (
        <section className="rounded-xl border border-warning bg-card p-5" data-testid="low-stock-alerts">
          <h2 className="flex items-center gap-2 font-semibold"><AlertTriangle className="size-5 text-warning" aria-hidden /> Low stock alerts</h2>
          <ul className="mt-2 flex flex-wrap gap-2 text-sm">
            {low.map((p) => <li key={p.id} className="rounded-md bg-muted px-2 py-1">{p.name}: <strong>{p.stock}</strong></li>)}
          </ul>
        </section>
      )}

      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Products & inventory</h2>
          <Button onClick={() => setEditing("new")} data-testid="new-product">Add product</Button>
        </div>
        {editing && <ProductForm product={editing === "new" ? null : editing} onDone={() => setEditing(null)} />}
        <div className="mt-4 overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left"><tr><th className="p-3">ID</th><th className="p-3">Name</th><th className="p-3">Category</th><th className="p-3">Price</th><th className="p-3">Stock</th><th className="p-3"><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {products.data?.map((p) => (
                <tr key={p.id} className="border-t" data-testid={`admin-product-${p.id}`}>
                  <td className="p-3 font-mono text-xs">{p.id}</td>
                  <td className="p-3">{p.name}</td>
                  <td className="p-3">{p.category}</td>
                  <td className="p-3">{formatPrice(Number(p.price))}</td>
                  <td className={`p-3 font-semibold ${p.stock <= LOW_STOCK ? "text-destructive" : ""}`}>{p.stock}</td>
                  <td className="space-x-2 whitespace-nowrap p-3 text-right">
                    <Button size="sm" variant="outline" data-testid={`edit-${p.id}`} onClick={() => setEditing(p)}>Edit</Button>
                    <Button size="sm" variant="destructive" data-testid={`delete-${p.id}`} disabled={del.isPending}
                      onClick={() => { if (confirm(`Delete ${p.name}?`)) del.mutate(p.id); }}>Delete</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold">Orders</h2>
        {orders.isLoading && <p className="mt-4 text-muted-foreground">Loading…</p>}
        {orders.data?.length === 0 && <p className="mt-4 text-muted-foreground">No orders yet.</p>}
        <div className="mt-4 overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left"><tr><th className="p-3">Order</th><th className="p-3">Customer</th><th className="p-3">Date</th><th className="p-3">Total</th><th className="p-3">Status</th></tr></thead>
            <tbody>
              {orders.data?.map((o) => (
                <tr key={o.id} className="border-t" data-testid={`admin-order-${o.order_number}`}>
                  <td className="p-3 font-semibold">{o.order_number}</td>
                  <td className="p-3">{o.customer_name}<br /><span className="text-muted-foreground">{o.email}</span></td>
                  <td className="p-3">{new Date(o.created_at).toLocaleDateString()}</td>
                  <td className="p-3">{formatPrice(Number(o.total))}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={o.status} />
                      <label className="sr-only" htmlFor={`st-${o.id}`}>Change status</label>
                      <select id={`st-${o.id}`} data-testid={`status-select-${o.order_number}`} className="h-8 rounded-md border border-input bg-card px-2" value={o.status}
                        onChange={(e) => setStatus.mutate({ id: o.id, status: e.target.value as never })}>
                        {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function ProductForm({ product, onDone }: { product: Product | null; onDone: () => void }) {
  const qc = useQueryClient();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const r = productSchema.safeParse(Object.fromEntries(new FormData(e.currentTarget)));
    if (!r.success) return setErrors(Object.fromEntries(r.error.issues.map((i) => [i.path[0], i.message])));
    setErrors({});
    setBusy(true);
    const { error } = product
      ? await supabase.from("products").update({ ...r.data, id: undefined }).eq("id", product.id)
      : await supabase.from("products").insert(r.data);
    setBusy(false);
    if (error) return setErrors({ form: error.code === "23505" ? "A product with this ID already exists." : "Could not save product." });
    toast.success(product ? "Product updated" : "Product created");
    qc.invalidateQueries({ queryKey: ["products"] });
    onDone();
  }
  const f = (name: keyof z.infer<typeof productSchema>, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <Label htmlFor={`pf-${name}`}>{label}</Label>
      <Input id={`pf-${name}`} name={name} data-testid={`pf-${name}`} className="mt-1" defaultValue={product ? String(product[name] ?? "") : ""} {...props} />
      {errors[name] && <p className="mt-1 text-sm text-destructive">{errors[name]}</p>}
    </div>
  );
  return (
    <form noValidate onSubmit={onSubmit} className="mt-4 grid gap-4 rounded-xl border bg-card p-5 md:grid-cols-3" data-testid="product-form">
      {f("id", "Product ID", { readOnly: !!product })}
      {f("name", "Name")}
      <div>
        <Label htmlFor="pf-category">Category</Label>
        <select id="pf-category" name="category" data-testid="pf-category" defaultValue={product?.category ?? "Electronics"} className="mt-1 h-9 w-full rounded-md border border-input bg-card px-3 text-sm">
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>
      {f("price", "Price (USD)", { type: "number", step: "0.01", min: 0 })}
      {f("stock", "Stock", { type: "number", min: 0 })}
      {f("rating", "Rating (0–5)", { type: "number", step: "0.1", min: 0, max: 5 })}
      <div className="md:col-span-3">{f("image_url", "Image URL (optional)")}</div>
      <div className="md:col-span-3">
        <Label htmlFor="pf-description">Description</Label>
        <Textarea id="pf-description" name="description" data-testid="pf-description" className="mt-1" defaultValue={product?.description ?? ""} maxLength={2000} />
      </div>
      {errors.form && <p role="alert" className="text-sm text-destructive md:col-span-3">{errors.form}</p>}
      <div className="flex gap-2 md:col-span-3">
        <Button type="submit" disabled={busy} data-testid="pf-save">{busy ? "Saving…" : "Save product"}</Button>
        <Button type="button" variant="outline" onClick={onDone}>Cancel</Button>
      </div>
    </form>
  );
}
