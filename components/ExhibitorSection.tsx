"use client";

import { useExhibitorCatalogue } from "@/components/ExhibitorCatalogue";

export function ExhibitorSection() {
  const catalogue = useExhibitorCatalogue();
  const exhibitors = catalogue.status === "ready" ? catalogue.exhibitors : [];

  return (
    <section id="exhibitors" className="mx-auto max-w-6xl px-5 py-20 sm:px-6">
      <div className="max-w-2xl">
        <p className="text-xs font-medium tracking-[0.2em] text-accent uppercase">
          Exhibitors
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          Catalogue exhibitors
        </h2>
        <p className="mt-4 text-base leading-7 text-muted">
          This section is ready for companies imported from the MMI catalogue.
          It does not show sample companies.
        </p>
      </div>

      {catalogue.status === "loading" ? (
        <div
          role="status"
          className="mt-10 rounded-2xl border border-line bg-card px-6 py-12 text-center shadow-sm"
        >
          <p className="text-base font-medium text-ink">Loading catalogue exhibitors</p>
        </div>
      ) : catalogue.status === "error" ? (
        <div
          role="alert"
          className="mt-10 rounded-2xl border border-line bg-card px-6 py-12 text-center shadow-sm"
        >
          <p className="text-base font-medium text-ink">Catalogue unavailable</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
            The exhibitor list could not be loaded. Try again in a moment.
          </p>
        </div>
      ) : exhibitors.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-line bg-card px-6 py-12 text-center shadow-sm">
          <p className="text-base font-medium text-ink">No exhibitor records loaded</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
            Company name, show, country, hall, and booth will appear here after
            the catalogue database is connected.
          </p>
        </div>
      ) : (
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {exhibitors.map((exhibitor) => (
            <li
              key={exhibitor.id}
              className="rounded-2xl border border-line bg-card px-5 py-5 shadow-sm"
            >
              <h3 className="font-semibold text-ink">{exhibitor.companyName}</h3>
              {exhibitor.showName ? (
                <p className="mt-2 text-sm text-muted">{exhibitor.showName}</p>
              ) : null}
              <p className="mt-3 text-sm text-foreground">
                {[exhibitor.country, exhibitor.hallNumber, exhibitor.boothNumber]
                  .filter(Boolean)
                  .join(" · ") || "Stand details unavailable"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
