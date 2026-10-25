import { fromPrice } from "@/lib/pricing";
import { cad } from "@/lib/format";
import { Diagonals } from "./Diagonals";
import { SloganRotator } from "./SloganRotator";

export function Hero() {
  const from = fromPrice();

  return (
    <section className="hero navy-panel" id="top">
      <div className="art" aria-hidden="true">
        <Diagonals />
      </div>
      <div className="wrap panel-inner hero-inner">
        <div className="hero-copy">
          <p className="kicker">
            <img src="/brand/app-icon.png" alt="" width={36} height={36} />
            Toronto home cleaning
          </p>
          <h1>
            More living.
            <br />
            <em>Less cleaning.</em>
          </h1>
          <SloganRotator />
          <p className="lede">
            A Tydlii-certified cleaner, in the window you book. If a Standard clean misses the
            mark, we come back and re-clean.
          </p>
          <div className="hero-actions">
            <a className="btn btn-teal" href="#quote">
              Get an instant quote
            </a>
            <a className="btn btn-ghost" href="#waitlist">
              Join the waitlist
            </a>
          </div>
          <p className="hero-from">
            From {cad(from.beforeHst)} a visit, before HST. Weekly plan, homes under 600 sq ft.
          </p>
          <ul className="hero-points">
            <li>Tydlii-certified cleaner</li>
            <li>In the window you booked</li>
            <li>Re-clean if Standard is missed</li>
          </ul>
          <p className="hero-areas">
            Opening first in CityPlace, King West, and Liberty Village.
          </p>
        </div>
      </div>
    </section>
  );
}
