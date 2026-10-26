import { useQuery } from "@tanstack/react-query";
import { productsQuery, type Product } from "./products";
import { useCart } from "./cart";
import { calcTotals } from "./pricing";

export type DetailedLine = { product: Product | undefined; productId: string; quantity: number; problem: string | null };

export function useCartDetails() {
  const cart = useCart();
  const q = useQuery(productsQuery());
  const lines: DetailedLine[] = cart.lines.map((l) => {
    const product = q.data?.find((p) => p.id === l.productId);
    let problem: string | null = null;
    if (q.data && !product) problem = "This product is no longer available";
    else if (product && product.stock <= 0) problem = "Out of stock";
    else if (product && l.quantity > product.stock) problem = `Only ${product.stock} available`;
    return { ...l, product, problem };
  });
  const valid = lines.filter((l) => l.product && !l.problem);
  const totals = calcTotals(valid.map((l) => ({ price: Number(l.product!.price), quantity: l.quantity })));
  return { cart, lines, totals, loading: q.isLoading, error: q.error, hasProblems: lines.some((l) => l.problem) };
}
