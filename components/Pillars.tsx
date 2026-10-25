import { SectionIntro } from "./ui";

const PILLARS = [
  {
    title: "Know the price",
    body: "An instant price from your bedrooms, bathrooms and square footage, locked before you book.",
  },
  {
    title: "Know who's coming",
    body: "A vetted, Tydlii-certified cleaner in your booked window, every visit, briefed on your home notes.",
  },
  {
    title: "Know when",
    body: "A 1-hour arrival window and a live map as they head your way. Late? You're credited automatically.",
  },
  {
    title: "Know it's done",
    body: "After photos of every key room and the finished checklist, before you get home.",
  },
  {
    title: "Know it's handled",
    body: "Missed anything on the Tydlii Standard? Tell us within 48 hours and we re-clean within 24.",
  },
];

export function Pillars() {
  return (
    <section className="block pillars" aria-labelledby="promise-title">
      <SectionIntro
        center
        titleId="promise-title"
        kicker="Every clean, guaranteed"
        title="Know who's coming. Know what you'll pay."
        sub="Five promises, on every visit. No chasing, no guessing."
      />
      <ol className="pillar-grid">
        {PILLARS.map((pillar, index) => (
          <li key={pillar.title} className="pillar">
            <span className="pillar-index">{`0${index + 1}`}</span>
            <span className="accent-bar" />
            <h3>{pillar.title}</h3>
            <p>{pillar.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
