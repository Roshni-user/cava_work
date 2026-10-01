import type { ProductVisual as ProductVisualName } from "@/lib/data/products";

const visuals: Record<ProductVisualName, string> = {
  signal: "M40 88c18-28 36-28 54 0M67 52v18",
  location: "M67 40c14 0 24 10 24 22 0 18-24 38-24 38S43 80 43 62c0-12 10-22 24-22z",
  compute: "M48 48h38v38H48zM58 48V36M76 48V36M48 62H36M86 62h12M58 86v12M76 86v12",
  fleet: "M40 78h54M40 62h40M40 94h28",
  shield: "M67 36l28 12v22c0 18-14 30-28 36-14-6-28-18-28-36V48z",
};

export function ProductVisual({
  visual,
  className,
}: {
  visual: ProductVisualName;
  className?: string;
}) {
  return (
    <svg viewBox="0 0 134 134" className={className} aria-hidden="true">
      <path
        d={visuals[visual]}
        fill="none"
        stroke="#99f6e4"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
