import Link from "next/link";
import { ProductVisual } from "@/components/ProductVisual";
import type { HubbleProduct } from "@/lib/data/products";

export function ProductCard({ product }: { product: HubbleProduct }) {
  return (
    <article className="flex h-full flex-col rounded-2xl border border-line bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex h-28 items-center justify-center rounded-xl bg-ink">
        <ProductVisual visual={product.visual} className="h-16 w-16" />
      </div>
      <h3 className="mt-5 text-lg font-semibold tracking-tight text-ink">
        <Link
          href={`/products/${product.slug}`}
          className="transition-colors hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        >
          {product.name}
        </Link>
      </h3>
      <p className="mt-2 flex-1 text-sm leading-6 text-muted">
        {product.shortDescription}
      </p>
      <ul className="mt-4 flex flex-wrap gap-2">
        {product.features.map((feature) => (
          <li
            key={feature}
            className="rounded-full border border-line px-2.5 py-1 text-xs text-foreground"
          >
            {feature}
          </li>
        ))}
      </ul>
      <Link
        href={`/products/${product.slug}`}
        className="mt-5 inline-flex text-sm font-medium text-accent transition-colors hover:text-accent-strong"
      >
        View {product.name}
      </Link>
    </article>
  );
}
