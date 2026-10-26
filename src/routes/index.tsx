import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Cpu, Shirt, Sofa, Watch } from "lucide-react";
import hero from "@/assets/hero.jpg";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/ProductCard";
import { productsQuery, CATEGORIES } from "@/lib/products";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ShopEase — Everyday goods, thoughtfully chosen" },
      { name: "description", content: "Shop electronics, fashion, home goods and accessories at ShopEase. Free shipping over $100." },
      { property: "og:title", content: "ShopEase — Everyday goods, thoughtfully chosen" },
      { property: "og:description", content: "Shop electronics, fashion, home goods and accessories. Free shipping over $100." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(productsQuery()),
  component: Home,
});

const icons = { Electronics: Cpu, Fashion: Shirt, Home: Sofa, Accessories: Watch };

function Home() {
  const { data } = useSuspenseQuery(productsQuery());
  const featured = [...data].sort((a, b) => Number(b.rating) - Number(a.rating)).slice(0, 4);
  return (
    <>
      <section className="relative isolate overflow-hidden" data-testid="promo-banner">
        <img src={hero} alt="" width={1600} height={912} className="absolute inset-0 -z-10 h-full w-full object-cover" />
        <div className="absolute inset-0 -z-10 bg-hero-overlay" />
        <div className="mx-auto max-w-7xl px-4 py-24 md:py-36">
          <p className="text-sm font-semibold uppercase tracking-widest text-accent">Autumn edit · 10% off orders over $200</p>
          <h1 className="mt-4 max-w-xl text-5xl font-bold leading-[1.05] text-primary-foreground md:text-7xl">Good things, delivered easy.</h1>
          <p className="mt-5 max-w-md text-lg text-primary-foreground/85">Considered electronics, clothing and homewares. Free shipping on orders over $100.</p>
          <Button asChild variant="accent" size="lg" className="mt-8" data-testid="hero-shop-now">
            <Link to="/products">Shop the collection</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-16" aria-labelledby="cat-h">
        <h2 id="cat-h" className="text-3xl font-bold">Shop by category</h2>
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          {CATEGORIES.map((c) => {
            const Icon = icons[c];
            return (
              <Link key={c} to="/products" search={{ category: c }} data-testid={`category-${c}`}
                className="flex flex-col items-start gap-6 rounded-xl border bg-card p-5 shadow-card transition-colors hover:border-accent">
                <Icon className="size-7 text-accent" aria-hidden />
                <span className="font-display text-xl font-semibold">{c}</span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-16" aria-labelledby="feat-h">
        <div className="flex items-end justify-between">
          <h2 id="feat-h" className="text-3xl font-bold">Featured</h2>
          <Link to="/products" className="text-sm font-medium text-accent hover:underline">View all →</Link>
        </div>
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4" data-testid="featured-products">
          {featured.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>
    </>
  );
}
