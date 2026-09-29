"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { ExhibitorPreview } from "@/lib/data/exhibitors";

export type ExhibitorCatalogueState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; exhibitors: ExhibitorPreview[] };

const ExhibitorCatalogueContext = createContext<ExhibitorCatalogueState>({
  status: "loading",
});

function isPreview(value: unknown): value is ExhibitorPreview {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const row = value as Record<string, unknown>;

  return (
    typeof row.id === "string" &&
    typeof row.companyName === "string" &&
    (row.showName === null || typeof row.showName === "string") &&
    (row.country === null || typeof row.country === "string") &&
    (row.hallNumber === null || typeof row.hallNumber === "string") &&
    (row.boothNumber === null || typeof row.boothNumber === "string")
  );
}

export function ExhibitorCatalogueProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ExhibitorCatalogueState>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/exhibitors", { signal: controller.signal, headers: { accept: "application/json" } })
      .then(async (response) => {
        const body: unknown = await response.json().catch(() => null);

        if (!response.ok || typeof body !== "object" || body === null || !("exhibitors" in body)) {
          throw new Error("Exhibitor catalogue response was not usable.");
        }

        const exhibitors = (body as { exhibitors: unknown }).exhibitors;

        if (!Array.isArray(exhibitors) || !exhibitors.every(isPreview)) {
          throw new Error("Exhibitor catalogue response was not usable.");
        }

        return exhibitors;
      })
      .then((exhibitors) => setState({ status: "ready", exhibitors }))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setState({ status: "error" });
      });

    return () => controller.abort();
  }, []);

  return (
    <ExhibitorCatalogueContext.Provider value={state}>
      {children}
    </ExhibitorCatalogueContext.Provider>
  );
}

export function useExhibitorCatalogue() {
  return useContext(ExhibitorCatalogueContext);
}
