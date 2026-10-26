import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "My account — ShopEase" },
      { name: "description", content: "Your ShopEase account details." },
      { property: "og:title", content: "My account — ShopEase" },
      { property: "og:description", content: "Your ShopEase account details." },
    ],
  }),
  component: () => (
    <RequireAuth message="Sign in to view your account.">
      <Account />
    </RequireAuth>
  ),
});

function Account() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="mx-auto max-w-xl px-4 py-16" data-testid="account-page">
      <h1 className="text-4xl font-bold">My account</h1>
      <dl className="mt-6 space-y-3 rounded-xl border bg-card p-6">
        <div><dt className="text-sm text-muted-foreground">Email</dt><dd data-testid="account-email">{user?.email}</dd></div>
        <div><dt className="text-sm text-muted-foreground">Member since</dt><dd>{user && new Date(user.created_at).toLocaleDateString()}</dd></div>
        <div><dt className="text-sm text-muted-foreground">Role</dt><dd data-testid="account-role">{isAdmin ? "Administrator" : "Customer"}</dd></div>
      </dl>
      <div className="mt-6 flex gap-3">
        <Button asChild variant="outline"><Link to="/orders">My orders</Link></Button>
        <Button variant="destructive" data-testid="account-logout" onClick={async () => {
          await supabase.auth.signOut();
          toast.success("Signed out");
          navigate({ to: "/login", replace: true });
        }}>Log out</Button>
      </div>
    </div>
  );
}
