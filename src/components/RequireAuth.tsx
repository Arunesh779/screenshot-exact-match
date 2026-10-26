import type { ReactNode } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export function RequireAuth({ children, message }: { children: ReactNode; message: string }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <p className="px-4 py-24 text-center text-muted-foreground" data-testid="auth-loading">Loading…</p>;
  if (!user)
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center" data-testid="signin-required">
        <h1 className="text-3xl font-bold">Please sign in</h1>
        <p className="mt-2 text-muted-foreground">{message}</p>
        <Button asChild className="mt-6"><Link to="/login" search={{ redirect: loc.pathname }}>Sign in</Link></Button>
      </div>
    );
  return <>{children}</>;
}
