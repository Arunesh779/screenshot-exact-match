import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const safePath = (p?: string) => (p && p.startsWith("/") && !p.startsWith("//") ? p : "/");

export const Route = createFileRoute("/login")({
  validateSearch: z.object({ redirect: z.string().optional().catch(undefined) }),
  head: () => ({
    meta: [
      { title: "Sign in — ShopEase" },
      { name: "description", content: "Sign in to your ShopEase account." },
      { property: "og:title", content: "Sign in — ShopEase" },
      { property: "og:description", content: "Sign in to your ShopEase account." },
    ],
  }),
  component: Login,
});

const schema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email address").max(255),
  password: z.string().min(1, "Password is required"),
});

function Login() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const r = schema.safeParse({ email: fd.get("email"), password: fd.get("password") });
    if (!r.success) return setErrors(Object.fromEntries(r.error.issues.map((i) => [i.path[0], i.message])));
    setErrors({});
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword(r.data);
    setBusy(false);
    if (error) {
      const msg = /confirm/i.test(error.message) ? "Please confirm your email before signing in." : "Incorrect email or password.";
      setErrors({ form: msg });
      return;
    }
    toast.success("Welcome back!");
    navigate({ to: safePath(redirect) as "/" });
  }

  return (
    <AuthCard title="Sign in" footer={<>New to ShopEase? <Link to="/register" className="text-accent underline" data-testid="to-register">Create an account</Link></>}>
      <form noValidate onSubmit={onSubmit} className="space-y-4" data-testid="login-form">
        <Field id="email" label="Email" type="email" autoComplete="email" error={errors.email} />
        <Field id="password" label="Password" type="password" autoComplete="current-password" error={errors.password} />
        {errors.form && <p role="alert" className="text-sm text-destructive" data-testid="form-error">{errors.form}</p>}
        <Button type="submit" className="w-full" disabled={busy} data-testid="login-submit">{busy ? "Signing in…" : "Sign in"}</Button>
      </form>
    </AuthCard>
  );
}

export function AuthCard({ title, children, footer }: { title: string; children: React.ReactNode; footer: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="rounded-2xl border bg-card p-8 shadow-card">
        <h1 className="text-3xl font-bold">{title}</h1>
        <div className="mt-6">{children}</div>
        <p className="mt-6 text-center text-sm text-muted-foreground">{footer}</p>
      </div>
    </div>
  );
}

export function Field({ id, label, error, ...props }: { id: string; label: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={id} data-testid={`input-${id}`} aria-invalid={!!error} aria-describedby={error ? `${id}-err` : undefined} className="mt-1" {...props} />
      {error && <p id={`${id}-err`} className="mt-1 text-sm text-destructive" data-testid={`error-${id}`}>{error}</p>}
    </div>
  );
}
