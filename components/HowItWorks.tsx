import { SectionIntro } from "./ui";

const STEPS = [
  {
    title: "Book in under a minute",
    body: "Tell us about your home and pick a time. Your price is locked on the spot.",
  },
  {
    title: "Meet your cleaner",
    body: "Tydlii-certified: background-checked, ID-verified, trained to the Tydlii Standard and insured. In your window, every visit.",
  },
  {
    title: "Come home to clean",
    body: "Track the arrival, see the photos, and get your evening back.",
  },
];

export function HowItWorks() {
  return (
    <section className="block" id="how" aria-labelledby="how-title">
      <SectionIntro kicker="How it works" title="Tap. Book. Relax." titleId="how-title" />
      <ol className="steps">
        {STEPS.map((step, index) => (
          <li key={step.title}>
            <span className="step-num">{index + 1}</span>
            <h3>{step.title}</h3>
            <p>{step.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
