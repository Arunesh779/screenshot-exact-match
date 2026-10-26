import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { AuthCard, Field } from "./login";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create account — ShopEase" },
      { name: "description", content: "Create a ShopEase account to check out and track orders." },
      { property: "og:title", content: "Create account — ShopEase" },
      { property: "og:description", content: "Create a ShopEase account to check out and track orders." },
    ],
  }),
  component: Register,
});

const schema = z
  .object({
    email: z.string().trim().min(1, "Email is required").email("Enter a valid email address").max(255),
    password: z.string().min(8, "Password must be at least 8 characters").max(72),
    confirm: z.string().min(1, "Please confirm your password"),
  })
  .refine((d) => d.password === d.confirm, { path: ["confirm"], message: "Passwords do not match" });

function Register() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const r = schema.safeParse(Object.fromEntries(fd));
    if (!r.success) return setErrors(Object.fromEntries(r.error.issues.map((i) => [i.path[0], i.message])));
    setErrors({});
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: r.data.email,
      password: r.data.password,
      options: { emailRedirectTo: window.location.origin },
    });
    setBusy(false);
    if (error) return setErrors({ form: error.message.includes("already") ? "An account with this email already exists." : "Could not create account. Please try again." });
    if (data.session) return; // auto-confirm projects sign in immediately
    setSent(r.data.email);
  }

  if (sent)
    return (
      <AuthCard title="Check your email" footer={<Link to="/login" className="text-accent underline">Back to sign in</Link>}>
        <p data-testid="signup-success">We sent a confirmation link to <strong>{sent}</strong>. Click it to activate your account, then sign in.</p>
      </AuthCard>
    );

  return (
    <AuthCard title="Create account" footer={<>Already have an account? <Link to="/login" className="text-accent underline">Sign in</Link></>}>
      <form noValidate onSubmit={onSubmit} className="space-y-4" data-testid="register-form">
        <Field id="email" label="Email" type="email" autoComplete="email" error={errors.email} />
        <Field id="password" label="Password" type="password" autoComplete="new-password" error={errors.password} />
        <Field id="confirm" label="Confirm password" type="password" autoComplete="new-password" error={errors.confirm} />
        {errors.form && <p role="alert" className="text-sm text-destructive" data-testid="form-error">{errors.form}</p>}
        <Button type="submit" className="w-full" disabled={busy} data-testid="register-submit">{busy ? "Creating…" : "Create account"}</Button>
      </form>
    </AuthCard>
  );
}
