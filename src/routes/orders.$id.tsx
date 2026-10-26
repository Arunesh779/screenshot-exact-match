import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { CheckCircle2 } from "lucide-react";
import { RequireAuth } from "@/components/RequireAuth";
import { StatusBadge } from "@/components/StatusBadge";
import { OrderSummary } from "@/components/OrderSummary";
import { orderQuery } from "@/lib/orders";
import { formatPrice } from "@/lib/pricing";

export const Route = createFileRoute("/orders/$id")({
  validateSearch: z.object({ placed: z.boolean().optional().catch(undefined) }),
  head: () => ({ meta: [{ title: "Order details — ShopEase" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <RequireAuth message="Sign in to view this order.">
      <OrderDetail />
    </RequireAuth>
  ),
});

function OrderDetail() {
  const { id } = Route.useParams();
  const { placed } = Route.useSearch();
  const q = useQuery(orderQuery(id));
  if (q.isLoading) return <p className="px-4 py-24 text-center text-muted-foreground">Loading order…</p>;
  if (q.error) return <p className="px-4 py-24 text-center text-destructive" role="alert">Could not load this order.</p>;
  const o = q.data;
  if (!o)
    return (
      <div className="px-4 py-24 text-center" data-testid="order-not-found">
        <h1 className="text-3xl font-bold">Order not found</h1>
        <Link to="/orders" className="mt-4 inline-block text-accent underline">Back to my orders</Link>
      </div>
    );
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      {placed && (
        <div className="mb-8 flex items-start gap-3 rounded-xl border border-success bg-card p-5" data-testid="order-confirmation" role="status">
          <CheckCircle2 className="size-6 shrink-0 text-success" aria-hidden />
          <div>
            <p className="font-display text-xl font-semibold">Thank you — your order is confirmed!</p>
            <p className="text-sm text-muted-foreground">Test payment simulated successfully. A record has been saved to your order history.</p>
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold" data-testid="order-number">{o.order_number}</h1>
        <StatusBadge status={o.status} />
      </div>
      <p className="mt-1 text-sm text-muted-foreground">Placed {new Date(o.created_at).toLocaleString()}</p>
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <section className="rounded-xl border bg-card p-5">
          <h2 className="font-semibold">Items</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {o.order_items.map((i) => (
              <li key={i.id} className="flex justify-between gap-2"><span>{i.product_name} × {i.quantity}</span><span>{formatPrice(Number(i.unit_price) * i.quantity)}</span></li>
            ))}
          </ul>
          <div className="mt-4 border-t pt-4">
            <OrderSummary totals={{ subtotal: Number(o.subtotal), shipping: Number(o.shipping), discount: Number(o.discount), total: Number(o.total) }} />
          </div>
        </section>
        <section className="rounded-xl border bg-card p-5 text-sm">
          <h2 className="font-semibold">Shipping to</h2>
          <p className="mt-3">{o.customer_name}</p>
          <p className="text-muted-foreground">{o.email} · {o.phone}</p>
          <p className="mt-2 whitespace-pre-line">{o.address}</p>
        </section>
      </div>
      <Link to="/orders" className="mt-8 inline-block text-accent underline">← All orders</Link>
    </div>
  );
}
