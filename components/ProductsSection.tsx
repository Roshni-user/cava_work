import { ProductCard } from "@/components/ProductCard";
import type { HubbleProduct } from "@/lib/data/products";

export function ProductsSection({ products }: { products: HubbleProduct[] }) {
  return (
    <section id="products" className="border-y border-line bg-card/60">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <p className="text-xs font-medium tracking-[0.2em] text-accent uppercase">
              Features
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              Five areas of the Hubble module
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-6 text-muted">
            Each card opens its own feature page, using the same Hubble list.
          </p>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product.slug} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
