"use client";

import Link from "next/link";
import { useExhibitorCatalogue } from "@/components/ExhibitorCatalogue";
import type { HubbleProduct } from "@/lib/data/products";

export function Footer({
  products,
}: {
  products: HubbleProduct[];
}) {
  const catalogue = useExhibitorCatalogue();
  const exhibitors = catalogue.status === "ready" ? catalogue.exhibitors : [];
  return (
    <footer className="bg-ink text-slate-300">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:px-6 md:grid-cols-3">
        <div>
          <p className="text-sm font-semibold text-white">Cavli Wireless</p>
          <p className="mt-3 max-w-xs text-sm leading-6">
            Hubble landing page for connectivity features, catalogue exhibitors,
            and consultation requests.
          </p>
        </div>
        <div>
          <p className="text-xs tracking-[0.16em] text-teal-200 uppercase">
            Features
          </p>
          <ul className="mt-4 space-y-2">
            {products.map((product) => (
              <li key={product.slug}>
                <Link
                  href={`/products/${product.slug}`}
                  className="text-sm transition-colors hover:text-white"
                >
                  {product.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs tracking-[0.16em] text-teal-200 uppercase">
            Exhibitors
          </p>
          {catalogue.status === "loading" ? (
            <p className="mt-4 text-sm leading-6" role="status">
              Loading catalogue exhibitors.
            </p>
          ) : catalogue.status === "error" ? (
            <p className="mt-4 text-sm leading-6" role="alert">
              The exhibitor catalogue is unavailable.
            </p>
          ) : exhibitors.length === 0 ? (
            <p className="mt-4 text-sm leading-6">
              No catalogue records are loaded. Company names will be listed
              here when the database is connected.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {exhibitors.slice(0, 6).map((exhibitor) => (
                <li key={exhibitor.id} className="text-sm text-white">
                  {exhibitor.companyName}
                </li>
              ))}
            </ul>
          )}
          <Link href="/#consult" className="mt-5 inline-flex text-sm text-teal-200 hover:text-white">
            Consult now
          </Link>
        </div>
      </div>
    </footer>
  );
}
