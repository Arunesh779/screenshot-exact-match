import type { InputHTMLAttributes, ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AuthCard({ title, children, footer }: { title: string; children: ReactNode; footer: ReactNode }) {
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

export function Field({ id, label, error, ...props }: { id: string; label: string; error?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={id} data-testid={`input-${id}`} aria-invalid={!!error} aria-describedby={error ? `${id}-err` : undefined} className="mt-1" {...props} />
      {error && <p id={`${id}-err`} className="mt-1 text-sm text-destructive" data-testid={`error-${id}`}>{error}</p>}
    </div>
  );
}
