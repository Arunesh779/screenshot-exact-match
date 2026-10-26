import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { MAX_QTY } from "./pricing";

export type CartLine = { productId: string; quantity: number };
type CartCtx = {
  lines: CartLine[];
  count: number;
  add: (productId: string, qty: number, stock: number) => void;
  setQty: (productId: string, qty: number, stock: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
};
const KEY = "shopease-cart";
const Ctx = createContext<CartCtx | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]");
      if (Array.isArray(raw))
        setLines(raw.filter((l) => typeof l?.productId === "string" && Number.isInteger(l?.quantity) && l.quantity > 0));
    } catch {
      /* ignore corrupt cart */
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready) localStorage.setItem(KEY, JSON.stringify(lines));
  }, [lines, ready]);

  const cap = (q: number, stock: number) => Math.max(0, Math.min(q, stock, MAX_QTY));

  const value: CartCtx = {
    lines,
    count: lines.reduce((s, l) => s + l.quantity, 0),
    add: (id, qty, stock) =>
      setLines((prev) => {
        const cur = prev.find((l) => l.productId === id);
        const next = cap((cur?.quantity ?? 0) + qty, stock);
        if (next <= 0) return prev;
        return cur ? prev.map((l) => (l.productId === id ? { ...l, quantity: next } : l)) : [...prev, { productId: id, quantity: next }];
      }),
    setQty: (id, qty, stock) =>
      setLines((prev) => prev.map((l) => (l.productId === id ? { ...l, quantity: Math.max(1, cap(qty, stock)) } : l))),
    remove: (id) => setLines((prev) => prev.filter((l) => l.productId !== id)),
    clear: () => setLines([]),
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart outside CartProvider");
  return c;
}
