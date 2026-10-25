import { Diagonals } from "./Diagonals";

export function Closer() {
  return (
    <section className="closer navy-panel" aria-labelledby="closer-title">
      <div className="art" aria-hidden="true">
        <Diagonals />
      </div>
      <div className="wrap panel-inner closer-inner">
        <p className="kicker">Tydlii</p>
        <h2 id="closer-title">
          More living.
          <br />
          <em>Less cleaning.</em>
        </h2>
        <p>
          CityPlace, King West, and Liberty Village first. Yonge–Eglinton and North York Centre
          next.
        </p>
        <a className="btn btn-teal" href="#waitlist">
          Join the waitlist
        </a>
      </div>
    </section>
  );
}
