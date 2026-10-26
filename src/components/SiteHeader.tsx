import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Search, ShoppingBag, Menu, X } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const linkCls = "text-sm font-medium text-muted-foreground hover:text-foreground [&.active]:text-foreground";

export function SiteHeader() {
  const { count } = useCart();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  const links = (
    <>
      <Link to="/" className={linkCls} data-testid="nav-home" activeOptions={{ exact: true }} onClick={() => setOpen(false)}>Home</Link>
      <Link to="/products" className={linkCls} data-testid="nav-products" onClick={() => setOpen(false)}>Products</Link>
      <Link to="/orders" className={linkCls} data-testid="nav-orders" onClick={() => setOpen(false)}>My Orders</Link>
      {isAdmin && <Link to="/admin" className={linkCls} data-testid="nav-admin" onClick={() => setOpen(false)}>Admin</Link>}
      {user ? (
        <>
          <Link to="/account" className={linkCls} data-testid="nav-account" onClick={() => setOpen(false)}>Account</Link>
          <button
            className={linkCls}
            data-testid="nav-logout"
            onClick={async () => {
              await supabase.auth.signOut();
              setOpen(false);
              toast.success("Signed out");
              navigate({ to: "/", replace: true });
            }}
          >
            Logout
          </button>
        </>
      ) : (
        <Link to="/login" className={linkCls} data-testid="nav-login" onClick={() => setOpen(false)}>Login</Link>
      )}
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4">
        <Link to="/" className="font-display text-2xl font-bold tracking-tight" data-testid="logo">
          Shop<span className="text-accent">Ease</span>
        </Link>
        <form
          role="search"
          className="relative ml-2 hidden flex-1 md:block md:max-w-sm"
          onSubmit={(e) => {
            e.preventDefault();
            navigate({ to: "/products", search: { q: q.trim() || undefined } });
          }}
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input aria-label="Search products" data-testid="header-search" placeholder="Search products…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" maxLength={100} />
        </form>
        <nav className="ml-auto hidden items-center gap-5 md:flex" aria-label="Main">{links}</nav>
        <Link to="/cart" className="relative ml-auto inline-flex items-center gap-1 md:ml-0" data-testid="nav-cart" aria-label={`Cart, ${count} items`}>
          <ShoppingBag className="size-5" />
          <span className="text-sm font-medium">Cart</span>
          {count > 0 && (
            <span data-testid="cart-count" className="absolute -right-3 -top-2 rounded-full bg-accent px-1.5 text-xs font-semibold text-accent-foreground">{count}</span>
          )}
        </Link>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Toggle menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          {open ? <X /> : <Menu />}
        </Button>
      </div>
      {open && <nav className="flex flex-col gap-3 border-t px-4 py-4 md:hidden" aria-label="Mobile">{links}</nav>}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t bg-secondary">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-3">
        <div>
          <p className="font-display text-xl font-bold">Shop<span className="text-accent">Ease</span></p>
          <p className="mt-2 text-sm text-muted-foreground">Everyday goods, thoughtfully chosen.</p>
        </div>
        <div className="flex flex-col gap-2 text-sm">
          <Link to="/products" className="hover:text-accent">All products</Link>
          <Link to="/cart" className="hover:text-accent">Cart</Link>
          <Link to="/orders" className="hover:text-accent">My orders</Link>
        </div>
        <p className="text-sm text-muted-foreground">Test environment — payments are simulated and no real cards are charged.</p>
      </div>
    </footer>
  );
}
