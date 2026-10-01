const points = [
  {
    title: "One module",
    text: "Connectivity, positioning, and local processing sit on the same part.",
  },
  {
    title: "Built for products",
    text: "The feature set is aimed at devices that ship and stay in the field.",
  },
  {
    title: "Ready to discuss",
    text: "A consultation form is on this page.",
  },
];

export function IntroSection() {
  return (
    <section id="about" className="mx-auto max-w-6xl px-5 py-20 sm:px-6">
      <div className="max-w-2xl">
        <p className="text-xs font-medium tracking-[0.2em] text-accent uppercase">
          Introduction
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          What Hubble is for
        </h2>
        <p className="mt-4 text-base leading-7 text-muted">
          Hubble modules give a product a path onto the mobile network. The
          notes on this page are a short introduction for the assignment. They
          are not a datasheet.
        </p>
      </div>
      <ul className="mt-10 grid gap-4 md:grid-cols-3">
        {points.map((point) => (
          <li
            key={point.title}
            className="rounded-2xl border border-line bg-card px-5 py-6 shadow-sm"
          >
            <h3 className="text-base font-semibold text-ink">{point.title}</h3>
            <p className="mt-2 text-sm leading-6 text-muted">{point.text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
