import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductModelViewer } from "@/components/ProductModelViewer";
import { findProduct, products } from "@/lib/data/products";

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return products.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = findProduct(slug);

  if (!product) {
    return {
      title: "Feature not found | Cavli Wireless",
      description: "This Hubble feature is not part of the current list.",
    };
  }

  return {
    title: `${product.name} | Cavli Wireless`,
    description: product.shortDescription,
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = findProduct(slug);

  if (!product) {
    notFound();
  }

  const others = products.filter((item) => item.slug !== product.slug);

  return (
    <main className="mx-auto max-w-6xl px-5 py-12 sm:px-6 sm:py-16">
      <nav aria-label="Product">
        <Link
          href="/#products"
          className="text-sm font-medium text-accent transition-colors hover:text-accent-strong"
        >
          Back to features
        </Link>
      </nav>

      <article className="mt-8 grid items-start gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12">
        <ProductModelViewer />

        <div>
          <p className="text-xs font-medium tracking-[0.2em] text-accent uppercase">Hubble</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
            {product.name}
          </h1>
          <p className="mt-5 text-lg leading-8 text-foreground">{product.shortDescription}</p>
          <p className="mt-4 text-base leading-7 text-muted">{product.description}</p>

          <h2 className="mt-8 text-sm font-semibold tracking-[0.16em] text-ink uppercase">
            Included details
          </h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-3">
            {product.features.map((feature) => (
              <li
                key={feature}
                className="rounded-2xl border border-line bg-card px-4 py-4 text-sm font-medium text-ink shadow-sm"
              >
                {feature}
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/#consult"
              className="rounded-full bg-accent px-5 py-3 text-center text-sm font-medium text-white transition-colors hover:bg-accent-strong"
            >
              Consult now
            </Link>
            <Link
              href="/#products"
              className="rounded-full border border-line bg-card px-5 py-3 text-center text-sm font-medium text-ink transition-colors hover:border-accent"
            >
              View all features
            </Link>
          </div>
        </div>
      </article>

      <section className="mt-16 border-t border-line pt-10" aria-labelledby="other-features">
        <h2 id="other-features" className="text-xl font-semibold tracking-tight text-ink">
          Other features
        </h2>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {others.map((item) => (
            <li key={item.slug}>
              <Link
                href={`/products/${item.slug}`}
                className="block rounded-2xl border border-line bg-card px-5 py-4 shadow-sm transition-shadow hover:shadow-md"
              >
                <span className="font-medium text-ink">{item.name}</span>
                <span className="mt-1 block text-sm leading-6 text-muted">
                  {item.shortDescription}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
