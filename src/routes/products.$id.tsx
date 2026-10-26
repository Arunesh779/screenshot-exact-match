import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Minus, Plus, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProductImage } from "@/components/ProductImage";
import { productQuery } from "@/lib/products";
import { useCart } from "@/lib/cart";
import { clampQty, formatPrice } from "@/lib/pricing";

export const Route = createFileRoute("/products/$id")({
  loader: async ({ context, params }) => {
    const p = await context.queryClient.ensureQueryData(productQuery(params.id));
    if (!p) throw notFound();
    return p;
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.name} — ShopEase` },
          { name: "description", content: loaderData.description.slice(0, 155) },
          { property: "og:title", content: `${loaderData.name} — ShopEase` },
          { property: "og:description", content: loaderData.description.slice(0, 155) },
          ...(loaderData.image_url ? [{ property: "og:image", content: loaderData.image_url }, { name: "twitter:image", content: loaderData.image_url }] : []),
        ]
      : [{ title: "Product unavailable — ShopEase" }, { name: "robots", content: "noindex" }],
  }),
  notFoundComponent: () => (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-3xl font-bold">Product not found</h1>
      <Link to="/products" className="mt-4 inline-block text-accent hover:underline">Back to products</Link>
    </div>
  ),
  component: Detail,
});

function Detail() {
  const { id } = Route.useParams();
  const { data: p } = useSuspenseQuery(productQuery(id));
  const cart = useCart();
  const [qty, setQty] = useState(1);
  if (!p) return null;
  const inCart = cart.lines.find((l) => l.productId === p.id)?.quantity ?? 0;
  const available = Math.max(0, p.stock - inCart);
  const out = p.stock <= 0;

  return (
    <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 md:grid-cols-2">
      <ProductImage src={p.image_url} alt={p.name} className="aspect-square w-full rounded-2xl" />
      <div>
        <Link to="/products" search={{ category: p.category as never }} className="text-sm font-medium text-accent">{p.category}</Link>
        <h1 className="mt-2 text-4xl font-bold" data-testid="product-name">{p.name}</h1>
        <p className="mt-2 inline-flex items-center gap-1 text-sm text-muted-foreground"><Star className="size-4 fill-current text-warning" aria-hidden /> {Number(p.rating).toFixed(1)} rating · ID {p.id}</p>
        <p className="mt-6 text-3xl font-semibold" data-testid="product-detail-price">{formatPrice(Number(p.price))}</p>
        <p className="mt-6 leading-relaxed text-muted-foreground">{p.description}</p>
        <p className={`mt-6 text-sm font-medium ${out ? "text-destructive" : p.stock <= 5 ? "text-warning" : "text-success"}`} data-testid="stock-status">
          {out ? "Out of stock" : p.stock <= 5 ? `Only ${p.stock} left in stock` : `In stock (${p.stock} available)`}
        </p>

        {!out && (
          <div className="mt-6 flex flex-wrap items-end gap-4">
            <div>
              <Label htmlFor="qty">Quantity</Label>
              <div className="mt-1 flex items-center gap-1">
                <Button type="button" variant="outline" size="icon" aria-label="Decrease quantity" data-testid="qty-decrease" disabled={qty <= 1} onClick={() => setQty((q) => clampQty(q - 1, available))}><Minus /></Button>
                <Input id="qty" data-testid="qty-input" type="number" min={1} max={available} className="w-20 text-center" value={qty}
                  onChange={(e) => setQty(clampQty(Number(e.target.value), available || 1))} />
                <Button type="button" variant="outline" size="icon" aria-label="Increase quantity" data-testid="qty-increase" disabled={qty >= available} onClick={() => setQty((q) => clampQty(q + 1, available))}><Plus /></Button>
              </div>
            </div>
            <Button size="lg" variant="accent" data-testid="add-to-cart" disabled={available <= 0}
              onClick={() => {
                const n = clampQty(qty, available);
                if (n <= 0) return toast.error("No more stock available");
                cart.add(p.id, n, p.stock);
                toast.success(`Added ${n} × ${p.name} to cart`);
                setQty(1);
              }}>
              {available <= 0 ? "All stock in cart" : "Add to cart"}
            </Button>
          </div>
        )}
        {inCart > 0 && <p className="mt-3 text-sm text-muted-foreground">{inCart} already in your <Link to="/cart" className="text-accent underline">cart</Link>.</p>}
      </div>
    </div>
  );
}
