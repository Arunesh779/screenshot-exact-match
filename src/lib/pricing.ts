// Pricing rules — mirrored exactly by the place_order database function,
// which is the source of truth when an order is created.
export const FREE_SHIPPING_THRESHOLD = 100;
export const SHIPPING_FEE = 9.99;
export const DISCOUNT_THRESHOLD = 200;
export const DISCOUNT_RATE = 0.1;
export const MAX_QTY = 99;

export type PricedLine = { price: number; quantity: number };

const round2 = (n: number) => Math.round(n * 100) / 100;

export function calcTotals(lines: PricedLine[]) {
  const subtotal = round2(lines.reduce((s, l) => s + l.price * l.quantity, 0));
  const shipping = subtotal === 0 || subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  const discount = subtotal >= DISCOUNT_THRESHOLD ? round2(subtotal * DISCOUNT_RATE) : 0;
  const total = round2(subtotal + shipping - discount);
  return { subtotal, shipping, discount, total };
}

/** Clamp a requested quantity to [1, min(stock, MAX_QTY)]. Returns 0 when out of stock. */
export function clampQty(requested: number, stock: number) {
  const max = Math.min(stock, MAX_QTY);
  if (max <= 0) return 0;
  if (!Number.isFinite(requested)) return 1;
  return Math.max(1, Math.min(Math.floor(requested), max));
}

export const formatPrice = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
