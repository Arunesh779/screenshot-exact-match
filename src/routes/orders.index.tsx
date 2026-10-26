import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { RequireAuth } from "@/components/RequireAuth";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { myOrdersQuery } from "@/lib/orders";
import { formatPrice } from "@/lib/pricing";

export const Route = createFileRoute("/orders/")({
  head: () => ({
    meta: [
      { title: "My orders — ShopEase" },
      { name: "description", content: "Your ShopEase order history." },
      { property: "og:title", content: "My orders — ShopEase" },
      { property: "og:description", content: "Your ShopEase order history." },
    ],
  }),
  component: () => (
    <RequireAuth message="Sign in to see your order history.">
      <Orders />
    </RequireAuth>
  ),
});

function Orders() {
  const { user } = useAuth();
  const q = useQuery(myOrdersQuery(user!.id));
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-4xl font-bold">My orders</h1>
      {q.isLoading && <p className="mt-6 text-muted-foreground">Loading orders…</p>}
      {q.error && <p className="mt-6 text-destructive" role="alert">Could not load your orders. Please refresh.</p>}
      {q.data?.length === 0 && (
        <div className="mt-6 rounded-xl border border-dashed p-12 text-center" data-testid="no-orders">
          <p className="font-display text-xl font-semibold">No orders yet</p>
          <Button asChild className="mt-4"><Link to="/products">Start shopping</Link></Button>
        </div>
      )}
      <ul className="mt-6 space-y-3" data-testid="order-list">
        {q.data?.map((o) => (
          <li key={o.id}>
            <Link to="/orders/$id" params={{ id: o.id }} data-testid={`order-row-${o.order_number}`}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4 shadow-card hover:border-accent">
              <div>
                <p className="font-semibold">{o.order_number}</p>
                <p className="text-sm text-muted-foreground">{new Date(o.created_at).toLocaleString()} · {o.order_items.reduce((s, i) => s + i.quantity, 0)} items</p>
              </div>
              <div className="flex items-center gap-4"><StatusBadge status={o.status} /><span className="font-semibold">{formatPrice(Number(o.total))}</span></div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
