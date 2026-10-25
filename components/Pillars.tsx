const PILLARS = [
  {
    n: "01",
    title: "The window you booked",
    body: "You choose a window. A Tydlii-certified cleaner arrives inside it.",
  },
  {
    n: "02",
    title: "Certified, every visit",
    body: "The promise is the Tydlii standard. It is not a named person who always returns.",
  },
  {
    n: "03",
    title: "Re-clean if we miss",
    body: "If a Standard clean misses the mark, we come back and re-clean.",
  },
  {
    n: "04",
    title: "A price you can see",
    body: "The quote shows the visit before HST and with 13% HST, before you join the list.",
  },
];

export function Pillars() {
  return (
    <section className="section pillars-section" id="promise" aria-labelledby="promise-title">
      <div className="wrap pillars-layout">
        <div className="section-intro">
          <p className="eyebrow">The promise</p>
          <h2 id="promise-title">A certified clean, in the window you booked.</h2>
          <p>
            Tydlii sends a certified cleaner to your home. We hold the visit to one standard.
            We do not lock you to one person.
          </p>
        </div>
        <ol className="pillar-list">
          {PILLARS.map((pillar) => (
            <li key={pillar.n}>
              <span>{pillar.n}</span>
              <div>
                <h3>{pillar.title}</h3>
                <p>{pillar.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
