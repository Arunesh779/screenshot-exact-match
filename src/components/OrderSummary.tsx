import { formatPrice, FREE_SHIPPING_THRESHOLD } from "@/lib/pricing";

export function OrderSummary({ totals }: { totals: { subtotal: number; shipping: number; discount: number; total: number } }) {
  return (
    <dl className="space-y-2 text-sm" data-testid="order-summary">
      <div className="flex justify-between"><dt>Subtotal</dt><dd data-testid="summary-subtotal">{formatPrice(totals.subtotal)}</dd></div>
      <div className="flex justify-between"><dt>Shipping</dt><dd data-testid="summary-shipping">{totals.shipping === 0 ? "Free" : formatPrice(totals.shipping)}</dd></div>
      {totals.discount > 0 && <div className="flex justify-between text-success"><dt>Discount (10%)</dt><dd data-testid="summary-discount">−{formatPrice(totals.discount)}</dd></div>}
      <div className="flex justify-between border-t pt-3 text-base font-semibold"><dt>Total</dt><dd data-testid="summary-total">{formatPrice(totals.total)}</dd></div>
      {totals.subtotal > 0 && totals.subtotal < FREE_SHIPPING_THRESHOLD && (
        <p className="text-xs text-muted-foreground">Add {formatPrice(FREE_SHIPPING_THRESHOLD - totals.subtotal)} more for free shipping.</p>
      )}
    </dl>
  );
}
