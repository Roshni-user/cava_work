import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Feature not found | Cavli Wireless",
  description: "This Hubble feature is not part of the current list.",
};

export default function ProductNotFound() {
  return (
    <main className="mx-auto flex max-w-3xl flex-1 flex-col justify-center px-5 py-24 sm:px-6">
      <p className="text-xs font-medium tracking-[0.2em] text-accent uppercase">Hubble</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight text-ink">Feature not found</h1>
      <p className="mt-4 max-w-xl text-base leading-7 text-muted">
        That address does not match a Hubble feature in the current list.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/#products"
          className="rounded-full bg-accent px-5 py-3 text-center text-sm font-medium text-white transition-colors hover:bg-accent-strong"
        >
          Back to features
        </Link>
        <Link
          href="/"
          className="rounded-full border border-line bg-card px-5 py-3 text-center text-sm font-medium text-ink transition-colors hover:border-accent"
        >
          Home
        </Link>
      </div>
    </main>
  );
}
