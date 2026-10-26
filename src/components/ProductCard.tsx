import { Link } from "@tanstack/react-router";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ProductImage } from "./ProductImage";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/pricing";
import type { Product } from "@/lib/products";

export function ProductCard({ product }: { product: Product }) {
  const cart = useCart();
  const out = product.stock <= 0;
  return (
    <article data-testid={`product-card-${product.id}`} className="group flex flex-col overflow-hidden rounded-xl border bg-card shadow-card">
      <Link to="/products/$id" params={{ id: product.id }} className="block overflow-hidden" aria-label={product.name}>
        <ProductImage src={product.image_url} alt={product.name} className="aspect-[4/3] w-full transition-transform duration-500 group-hover:scale-105" />
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{product.category}</span>
          <span className="inline-flex items-center gap-1"><Star className="size-3 fill-current text-warning" aria-hidden />{Number(product.rating).toFixed(1)}</span>
        </div>
        <Link to="/products/$id" params={{ id: product.id }} className="font-display text-lg font-semibold leading-tight hover:text-accent">
          {product.name}
        </Link>
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="text-lg font-semibold" data-testid="product-price">{formatPrice(Number(product.price))}</span>
          <Button
            size="sm"
            variant={out ? "secondary" : "default"}
            disabled={out}
            data-testid={`add-to-cart-${product.id}`}
            onClick={() => {
              cart.add(product.id, 1, product.stock);
              toast.success(`${product.name} added to cart`);
            }}
          >
            {out ? "Out of stock" : "Add to cart"}
          </Button>
        </div>
      </div>
    </article>
  );
}
