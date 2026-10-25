import { SectionIntro } from "./ui";

const REASONS = [
  {
    title: "See the job, then decide",
    body: "Every offer shows the area, home size, estimated time and your dollar share before you accept.",
  },
  {
    title: "Paid daily. Tips are yours.",
    body: "Earnings land daily, 100% of tips go to you, and there are no fines. Ever.",
  },
  {
    title: "Your schedule",
    body: "Choose your days and areas. Fill gaps around your own clients or build a full week.",
  },
  {
    title: "Regulars, close together",
    body: "Steady routes of repeat homes downtown, so you clean more and travel less.",
  },
];

export function CleanerPitch() {
  return (
    <>
      <section className="block tight" aria-label="Cleaner earnings">
        <div className="earn">
          <svg className="earn-art" viewBox="0 0 1000 500" preserveAspectRatio="none" aria-hidden="true">
            <polygon points="0,0 380,0 260,500 0,500" fill="#20c7c7" opacity="0.9" />
            <polygon points="0,0 250,0 150,500 0,500" fill="#3c8dff" opacity="0.25" />
          </svg>
          <div className="earn-grid">
            <div className="earn-figure">
              <p>Your share of a $229 clean</p>
              <p className="earn-amount">$153.43</p>
              <p>2-bedroom bi-weekly in Liberty Village · about 3.5 hours · plus 100% of tips</p>
            </div>
            <div className="earn-copy">
              <p className="eyebrow on-dark">Clean with Tydlii</p>
              <h2>Keep more of every job. Get paid daily.</h2>
              <p>
                A fixed 67% share of every job price, rising to 72% as you grow. See your earnings before you
                accept. Regulars close together across downtown Toronto.
              </p>
              <div className="share">
                <div className="share-track" aria-hidden="true">
                  <span className="share-you" />
                  <span className="share-grow" />
                </div>
                <div className="share-labels">
                  <span>67% yours from day one</span>
                  <span>up to 72%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="block" aria-labelledby="cleaner-why-title">
        <SectionIntro
          kicker="Why cleaners choose Tydlii"
          title="Built around your week, not ours."
          titleId="cleaner-why-title"
        />
        <div className="reason-grid">
          {REASONS.map((reason) => (
            <article key={reason.title} className="reason">
              <span className="accent-bar" />
              <h3>{reason.title}</h3>
              <p>{reason.body}</p>
            </article>
          ))}
        </div>
        <p className="fine">
          Late-arrival credits and re-cleans are paid by Tydlii, never taken from your pay. Stop a job for
          safety and you&apos;re still paid.
        </p>
      </section>
    </>
  );
}
