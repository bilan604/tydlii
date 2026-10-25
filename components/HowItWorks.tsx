const STEPS = [
  {
    n: "01",
    title: "Size up the home",
    body: "Beds, baths, and square feet. The quote updates before you share an email.",
  },
  {
    n: "02",
    title: "Join your neighbourhood",
    body: "Customers and cleaners each have a list. We write when that area opens.",
  },
  {
    n: "03",
    title: "Book a window",
    body: "When booking opens, pick a window. A Tydlii-certified cleaner takes the visit.",
  },
];

export function HowItWorks() {
  return (
    <section className="section how-section" id="how" aria-labelledby="how-title">
      <div className="wrap">
        <div className="section-intro how-intro">
          <p className="eyebrow">How it works</p>
          <h2 id="how-title">Tap. Book. Relax.</h2>
        </div>
        <ol className="steps">
          {STEPS.map((step) => (
            <li key={step.n}>
              <span>{step.n}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </li>
          ))}
        </ol>
        <aside className="promise-band">
          <p className="eyebrow">Plainly</p>
          <div className="promise-grid">
            <h2>Not the same cleaner.</h2>
            <div>
              <p className="promise-lead">A Tydlii-certified cleaner, every visit.</p>
              <p>
                You book a window. We send a cleaner held to the Tydlii standard. We do not
                promise that one person returns. If a Standard clean misses the mark, we re-clean.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
