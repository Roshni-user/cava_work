"use client";

import Link from "next/link";
import { useState } from "react";
import { useExhibitorCatalogue } from "@/components/ExhibitorCatalogue";

const navLinks = [
  { href: "/#about", label: "Hubble" },
  { href: "/#products", label: "Features" },
  { href: "/#exhibitors", label: "Exhibitors" },
  { href: "/#consult", label: "Consult" },
];

export function Header() {
  const [open, setOpen] = useState(false);
  const catalogue = useExhibitorCatalogue();
  const catalogueLabel =
    catalogue.status === "loading"
      ? "Loading"
      : catalogue.status === "error"
        ? "Unavailable"
        : catalogue.exhibitors.length === 0
          ? "No records"
          : `${catalogue.exhibitors.length} exhibitors`;
  const catalogueNote =
    catalogue.status === "loading"
      ? "Exhibitor catalogue is loading."
      : catalogue.status === "error"
        ? "Exhibitor catalogue is unavailable."
        : catalogue.exhibitors.length === 0
          ? "No exhibitor records are loaded."
          : `${catalogue.exhibitors.length} exhibitors are in the catalogue.`;

  function closeMenu() {
    setOpen(false);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-card/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:px-6">
        <Link
          href="/"
          className="text-sm font-semibold tracking-tight text-ink"
          onClick={closeMenu}
        >
          Cavli Wireless
        </Link>

        <nav className="hidden items-center gap-7 md:flex" aria-label="Primary">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-muted transition-colors hover:text-ink"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-4 lg:flex">
          <p className="text-xs tracking-wide text-muted uppercase">
            Catalogue
            <span className="ml-2 rounded-full border border-line px-2 py-1 text-[11px] tracking-normal text-foreground normal-case">
              {catalogueLabel}
            </span>
          </p>
          <Link
            href="/#consult"
            className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-strong"
          >
            Consult now
          </Link>
        </div>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line text-ink md:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((current) => !current)}
        >
          <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
          <span aria-hidden="true" className="flex flex-col gap-1.5">
            <span className="block h-px w-4 bg-ink" />
            <span className="block h-px w-4 bg-ink" />
            <span className="block h-px w-4 bg-ink" />
          </span>
        </button>
      </div>

      {open ? (
        <nav
          id="mobile-nav"
          className="border-t border-line bg-card px-5 py-4 md:hidden"
          aria-label="Mobile"
        >
          <ul className="space-y-1">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="block rounded-lg px-2 py-2 text-sm text-foreground hover:bg-background"
                  onClick={closeMenu}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-4 px-2 text-xs text-muted">{catalogueNote}</p>
          <Link
            href="/#consult"
            className="mt-3 block rounded-full bg-accent px-4 py-2 text-center text-sm font-medium text-white"
            onClick={closeMenu}
          >
            Consult now
          </Link>
        </nav>
      ) : null}
    </header>
  );
}
