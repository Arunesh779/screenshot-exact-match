import { createFileRoute, Link } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProductImage } from "@/components/ProductImage";
import { OrderSummary } from "@/components/OrderSummary";
import { useCartDetails } from "@/lib/use-cart-details";
import { formatPrice } from "@/lib/pricing";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your cart — ShopEase" },
      { name: "description", content: "Review the items in your ShopEase cart." },
      { property: "og:title", content: "Your cart — ShopEase" },
      { property: "og:description", content: "Review the items in your ShopEase cart." },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { cart, lines, totals, loading, hasProblems } = useCartDetails();

  if (lines.length === 0)
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center" data-testid="empty-cart">
        <h1 className="text-3xl font-bold">Your cart is empty</h1>
        <p className="mt-2 text-muted-foreground">Find something you love in the catalogue.</p>
        <Button asChild className="mt-6"><Link to="/products">Browse products</Link></Button>
      </div>
    );

  return (
    <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 lg:grid-cols-[1fr_360px]">
      <section>
        <h1 className="text-4xl font-bold">Cart</h1>
        {loading && <p className="mt-4 text-sm text-muted-foreground">Loading items…</p>}
        <ul className="mt-6 divide-y rounded-xl border bg-card">
          {lines.map((l) => (
            <li key={l.productId} className="flex gap-4 p-4" data-testid={`cart-item-${l.productId}`}>
              <ProductImage src={l.product?.image_url ?? null} alt={l.product?.name ?? "Product"} className="size-20 shrink-0 rounded-lg" />
              <div className="flex flex-1 flex-col gap-1">
                <div className="flex justify-between gap-2">
                  {l.product ? (
                    <Link to="/products/$id" params={{ id: l.productId }} className="font-semibold hover:text-accent">{l.product.name}</Link>
                  ) : <span className="font-semibold">Unavailable product</span>}
                  <span className="font-semibold" data-testid="line-total">{l.product ? formatPrice(Number(l.product.price) * l.quantity) : "—"}</span>
                </div>
                {l.product && <span className="text-sm text-muted-foreground">{formatPrice(Number(l.product.price))} each</span>}
                {l.problem && <span className="text-sm font-medium text-destructive" data-testid="line-problem">{l.problem}</span>}
                <div className="mt-auto flex items-center gap-3">
                  {l.product && l.product.stock > 0 && (
                    <>
                      <label htmlFor={`q-${l.productId}`} className="text-sm">Qty</label>
                      <Input id={`q-${l.productId}`} type="number" min={1} max={Math.min(l.product.stock, 99)} value={l.quantity} className="h-8 w-20"
                        data-testid={`cart-qty-${l.productId}`}
                        onChange={(e) => {
                          const n = Number(e.target.value);
                          if (Number.isFinite(n) && n >= 1) cart.setQty(l.productId, Math.floor(n), l.product!.stock);
                        }} />
                    </>
                  )}
                  <Button variant="ghost" size="sm" data-testid={`remove-${l.productId}`} onClick={() => cart.remove(l.productId)}>
                    <Trash2 /> Remove
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>
      <aside className="h-fit rounded-xl border bg-card p-6 shadow-card">
        <h2 className="text-xl font-bold">Summary</h2>
        <div className="mt-4"><OrderSummary totals={totals} /></div>
        {hasProblems && <p className="mt-4 text-sm text-destructive">Remove or fix the highlighted items to continue.</p>}
        <Button asChild={!hasProblems} variant="accent" size="lg" className="mt-6 w-full" disabled={hasProblems} data-testid="checkout-button">
          {hasProblems ? <span>Proceed to checkout</span> : <Link to="/checkout">Proceed to checkout</Link>}
        </Button>
      </aside>
    </div>
  );
}
