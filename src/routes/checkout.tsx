import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { RequireAuth } from "@/components/RequireAuth";
import { OrderSummary } from "@/components/OrderSummary";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { useCartDetails } from "@/lib/use-cart-details";
import { formatPrice } from "@/lib/pricing";
import { Field } from "@/components/AuthForm";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — ShopEase" },
      { name: "description", content: "Complete your ShopEase order." },
      { property: "og:title", content: "Checkout — ShopEase" },
      { property: "og:description", content: "Complete your ShopEase order." },
    ],
  }),
  component: () => (
    <RequireAuth message="Sign in to complete your order. Your cart is saved.">
      <Checkout />
    </RequireAuth>
  ),
});

const schema = z.object({
  name: z.string().trim().min(2, "Full name is required").max(100),
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email address").max(255),
  phone: z.string().trim().regex(/^\+?[0-9 \-]{7,20}$/, "Enter a valid phone number"),
  address: z.string().trim().min(10, "Enter your full shipping address").max(500),
});

function Checkout() {
  const { user } = useAuth();
  const { cart, lines, totals, hasProblems, loading } = useCartDetails();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const idemKey = useRef(crypto.randomUUID());

  if (lines.length === 0)
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center" data-testid="checkout-empty">
        <h1 className="text-3xl font-bold">Nothing to check out</h1>
        <Button asChild className="mt-6"><Link to="/products">Browse products</Link></Button>
      </div>
    );

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const r = schema.safeParse(Object.fromEntries(new FormData(e.currentTarget)));
    if (!r.success) return setErrors(Object.fromEntries(r.error.issues.map((i) => [i.path[0], i.message])));
    if (hasProblems) return setErrors({ form: "Some cart items are unavailable. Please update your cart." });
    setErrors({});
    setBusy(true);
    const { data, error } = await supabase.rpc("place_order", {
      _items: lines.map((l) => ({ product_id: l.productId, quantity: l.quantity })),
      _customer_name: r.data.name,
      _email: r.data.email,
      _phone: r.data.phone,
      _address: r.data.address,
      _idempotency_key: idemKey.current,
    });
    if (error) {
      setBusy(false);
      idemKey.current = crypto.randomUUID();
      const msg = error.message && error.message.length < 160 ? error.message : "Could not place your order. Please try again.";
      setErrors({ form: msg });
      toast.error(msg);
      qc.invalidateQueries({ queryKey: ["products"] });
      return;
    }
    const res = data as { order_id: string; order_number: string };
    cart.clear();
    qc.invalidateQueries({ queryKey: ["products"] });
    toast.success(`Order ${res.order_number} placed`);
    navigate({ to: "/orders/$id", params: { id: res.order_id }, search: { placed: true } });
  }

  return (
    <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 lg:grid-cols-[1fr_380px]">
      <section>
        <h1 className="text-4xl font-bold">Checkout</h1>
        <form noValidate onSubmit={onSubmit} className="mt-6 space-y-4 rounded-xl border bg-card p-6" data-testid="checkout-form">
          <Field id="name" label="Full name" autoComplete="name" error={errors.name} />
          <Field id="email" label="Email" type="email" autoComplete="email" defaultValue={user?.email ?? ""} error={errors.email} />
          <Field id="phone" label="Phone number" type="tel" autoComplete="tel" error={errors.phone} />
          <div>
            <Label htmlFor="address">Shipping address</Label>
            <Textarea id="address" name="address" data-testid="input-address" autoComplete="street-address" rows={3} maxLength={500} aria-invalid={!!errors.address} className="mt-1" />
            {errors.address && <p className="mt-1 text-sm text-destructive" data-testid="error-address">{errors.address}</p>}
          </div>
          <div className="rounded-lg border border-dashed border-warning bg-muted p-4 text-sm" data-testid="test-payment-notice">
            <p className="font-semibold">Test payment environment</p>
            <p className="text-muted-foreground">No real payment is taken and no card details are collected. Placing the order simulates a successful payment.</p>
          </div>
          {errors.form && <p role="alert" className="text-sm text-destructive" data-testid="form-error">{errors.form}</p>}
          <Button type="submit" size="lg" variant="accent" className="w-full" disabled={busy || loading || hasProblems} data-testid="place-order">
            {busy ? "Placing order…" : `Place order · ${formatPrice(totals.total)}`}
          </Button>
        </form>
      </section>
      <aside className="h-fit rounded-xl border bg-card p-6 shadow-card">
        <h2 className="text-xl font-bold">Order summary</h2>
        <ul className="mt-4 space-y-2 text-sm">
          {lines.map((l) => (
            <li key={l.productId} className="flex justify-between gap-2">
              <span>{l.product?.name ?? "Unavailable"} × {l.quantity}</span>
              <span>{l.product ? formatPrice(Number(l.product.price) * l.quantity) : "—"}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 border-t pt-4"><OrderSummary totals={totals} /></div>
        <p className="mt-3 text-xs text-muted-foreground">Final prices are recalculated securely when you place the order.</p>
      </aside>
    </div>
  );
}
