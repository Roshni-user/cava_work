export function Hero() {
  return (
    <section className="relative overflow-hidden bg-ink text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.08) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
        }}
      />
      <div className="relative mx-auto grid max-w-6xl gap-12 px-5 py-20 sm:px-6 lg:grid-cols-[1.3fr_0.7fr] lg:items-end lg:py-28">
        <div>
          <p className="text-xs font-medium tracking-[0.22em] text-teal-200 uppercase">
            Hubble
          </p>
          <h1 className="mt-5 max-w-xl text-4xl leading-tight font-semibold tracking-tight sm:text-5xl">
            Connected hardware for devices in the field
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
            Hubble is Cavli Wireless&apos;s module family for products that need
            a cellular link, a location reading, and room to run on the device
            itself.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href="#products"
              className="rounded-full bg-white px-5 py-3 text-center text-sm font-medium text-ink transition-colors hover:bg-teal-50"
            >
              View features
            </a>
            <a
              href="#consult"
              className="rounded-full border border-white/30 px-5 py-3 text-center text-sm font-medium text-white transition-colors hover:border-white"
            >
              Consult now
            </a>
          </div>
        </div>

        <div className="rounded-3xl border border-white/15 bg-white/5 p-6 backdrop-blur-sm">
          <p className="text-xs tracking-[0.18em] text-teal-200 uppercase">
            Module outline
          </p>
          <svg
            viewBox="0 0 280 160"
            className="mt-6 h-auto w-full"
            role="img"
            aria-label="Abstract outline of a connectivity module"
          >
            <rect
              x="18"
              y="28"
              width="244"
              height="104"
              rx="16"
              fill="none"
              stroke="rgba(255,255,255,0.7)"
              strokeWidth="1.5"
            />
            <rect
              x="40"
              y="48"
              width="92"
              height="64"
              rx="8"
              fill="none"
              stroke="#99f6e4"
              strokeWidth="1.5"
            />
            <path
              d="M156 64h78M156 80h58M156 96h68"
              stroke="rgba(255,255,255,0.75)"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <circle cx="230" cy="48" r="4" fill="#99f6e4" />
          </svg>
          <p className="mt-4 text-sm leading-6 text-slate-300">
            Five feature areas are listed below. Each one opens its own page.
          </p>
        </div>
      </div>
    </section>
  );
}
