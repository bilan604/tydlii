"use client";

import { useEffect, useMemo, useState } from "react";
import { cad, multiplierLabel } from "@/lib/format";
import {
  CONDITIONS,
  FREQUENCIES,
  SQFT_BANDS,
  quoteHome,
  type BandId,
  type Condition,
  type Frequency,
  type Quote,
} from "@/lib/pricing";
import { QUOTE_EVENT, QUOTE_STORAGE_KEY } from "@/lib/quote-summary";

function explanation(quote: Quote): string {
  if (quote.custom) return "";
  if (quote.condition === "overdue" && quote.plan) {
    return "The first visit is a reset clean (one-time rate × 1.4). Visits after that use your plan rate.";
  }
  if (quote.condition === "overdue") {
    return "This overdue visit is a reset clean: the one-time rate × 1.4.";
  }
  if (!quote.plan && quote.condition === "livedin") {
    return "Lived-in homes are priced at 1.1× the one-time rate.";
  }
  if (!quote.plan) {
    return "One-time visits use the one-time rate, then we round to the nearest price ending in 9.";
  }
  if (quote.condition === "livedin") {
    return "Lived-in homes are 1.1×. The first visit uses the one-time rate. Your plan rate starts after that.";
  }
  return "The first visit uses the one-time rate. Your plan rate starts on the next visit.";
}

export function QuoteCalculator() {
  const [band, setBand] = useState<BandId>("B");
  const [bedrooms, setBedrooms] = useState(1);
  const [fullBaths, setFullBaths] = useState(1);
  const [halfBaths, setHalfBaths] = useState(0);
  const [frequency, setFrequency] = useState<Frequency>("biweekly");
  const [condition, setCondition] = useState<Condition>("standard");

  const quote = useMemo(
    () => quoteHome({ band, bedrooms, fullBaths, halfBaths, frequency, condition }),
    [band, bedrooms, fullBaths, halfBaths, frequency, condition],
  );

  useEffect(() => {
    try {
      sessionStorage.setItem(QUOTE_STORAGE_KEY, JSON.stringify(quote));
    } catch {
      // Private mode can block storage. The quote still renders.
    }
    window.dispatchEvent(new Event(QUOTE_EVENT));
  }, [quote]);

  const headline = quote.custom ? null : (quote.plan ?? quote.first);
  const eyebrow = quote.custom
    ? "Custom"
    : quote.plan
      ? `${quote.frequencyLabel} plan`
      : quote.firstKind === "reset"
        ? "Reset clean"
        : "One-time visit";

  return (
    <section className="section quote-section" id="quote" aria-labelledby="quote-title">
      <div className="wrap quote-layout">
        <div>
          <p className="eyebrow">Instant quote</p>
          <h2 id="quote-title">See the price before you book.</h2>
          <p className="section-lead">
            Canadian dollars, rounded to the nearest price ending in 9. The first visit is priced
            on its own. HST is 13% and shown beside the pre-tax amount.
          </p>

          <div className="quote-form">
            <label className="field-label" htmlFor="sqft">
              Home size
            </label>
            <select
              id="sqft"
              className="field"
              value={band}
              onChange={(event) => setBand(event.target.value as BandId)}
            >
              {SQFT_BANDS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                  {item.base == null ? " · custom" : ""}
                </option>
              ))}
            </select>

            <div className="stepper-grid">
              <Stepper
                label="Bedrooms"
                valueLabel={bedrooms === 0 ? "Studio" : String(bedrooms)}
                decLabel="Fewer bedrooms"
                incLabel="More bedrooms"
                onDec={() => setBedrooms((value) => Math.max(0, value - 1))}
                onInc={() => setBedrooms((value) => Math.min(8, value + 1))}
                decDisabled={bedrooms === 0}
                incDisabled={bedrooms === 8}
              />
              <Stepper
                label="Full baths"
                valueLabel={String(fullBaths)}
                decLabel="Fewer full baths"
                incLabel="More full baths"
                onDec={() => setFullBaths((value) => Math.max(1, value - 1))}
                onInc={() => setFullBaths((value) => Math.min(8, value + 1))}
                decDisabled={fullBaths === 1}
                incDisabled={fullBaths === 8}
              />
              <Stepper
                label="Half baths"
                valueLabel={String(halfBaths)}
                decLabel="Fewer half baths"
                incLabel="More half baths"
                onDec={() => setHalfBaths((value) => Math.max(0, value - 1))}
                onInc={() => setHalfBaths((value) => Math.min(6, value + 1))}
                decDisabled={halfBaths === 0}
                incDisabled={halfBaths === 6}
              />
            </div>

            <fieldset>
              <legend>How often</legend>
              <div className="seg-grid" role="radiogroup" aria-label="How often">
                {FREQUENCIES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    role="radio"
                    aria-checked={frequency === item.id}
                    className={frequency === item.id ? "seg on" : "seg"}
                    onClick={() => setFrequency(item.id)}
                  >
                    <strong>{item.label}</strong>
                    <small>
                      {multiplierLabel(item.multiplier)} · {item.hint}
                    </small>
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend>Condition of the home</legend>
              <div className="condition-list">
                {CONDITIONS.map((item) => (
                  <label key={item.id} className={condition === item.id ? "choice on" : "choice"}>
                    <input
                      type="radio"
                      name="condition"
                      value={item.id}
                      checked={condition === item.id}
                      onChange={() => setCondition(item.id)}
                    />
                    <span>
                      <strong>{item.label}</strong>
                      <small>{item.hint}</small>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        </div>

        <aside className="quote-card">
          {quote.custom || !headline ? (
            <div className="quote-custom">
              <p className="quote-kicker">2,500+ sq ft</p>
              <h3>We’ll price this one with you.</h3>
              <p>
                Homes at this size are a custom quote. Join the waitlist and tell us about the
                home. No guessed number.
              </p>
              <a className="btn btn-teal" href="#waitlist">
                Join the waitlist
              </a>
            </div>
          ) : (
            <>
              <p className="quote-kicker">{eyebrow}</p>
              <p className="sr" aria-live="polite">
                {eyebrow}: {cad(headline.beforeHst)} before HST, {cad(headline.withHst, true)} with
                HST.
              </p>
              <p className="quote-price">{cad(headline.beforeHst)}</p>
              <p className="quote-tax">
                before HST
                <span>{cad(headline.withHst, true)} with 13% HST</span>
              </p>
              {quote.plan ? (
                <p className="quote-first">
                  {quote.firstKind === "reset" ? "Reset clean, first visit" : "First visit"}{" "}
                  <strong>{cad(quote.first.beforeHst)}</strong> before HST
                  <span> · {cad(quote.first.withHst, true)} with HST</span>
                </p>
              ) : null}
              <p className="quote-note">{explanation(quote)}</p>
              <dl className="breakdown">
                <div>
                  <dt>
                    Band {quote.band} · {quote.label}
                  </dt>
                  <dd>{cad(quote.base)}</dd>
                </div>
                {quote.bedroomAdd > 0 ? (
                  <div>
                    <dt>Bedrooms after the first</dt>
                    <dd>+{cad(quote.bedroomAdd)}</dd>
                  </div>
                ) : null}
                {quote.fullBathAdd > 0 ? (
                  <div>
                    <dt>Full baths after the first</dt>
                    <dd>+{cad(quote.fullBathAdd)}</dd>
                  </div>
                ) : null}
                {quote.halfBathAdd > 0 ? (
                  <div>
                    <dt>Half baths</dt>
                    <dd>+{cad(quote.halfBathAdd)}</dd>
                  </div>
                ) : null}
                <div>
                  <dt>Subtotal</dt>
                  <dd>{cad(quote.subtotal)}</dd>
                </div>
                {quote.planRaw != null ? (
                  <div>
                    <dt>
                      {quote.frequencyLabel} {multiplierLabel(quote.frequencyMultiplier)}
                      {quote.livedInMultiplier !== 1
                        ? ` · lived-in ${multiplierLabel(quote.livedInMultiplier)}`
                        : ""}
                    </dt>
                    <dd>{cad(quote.planRaw)}</dd>
                  </div>
                ) : null}
                <div>
                  <dt>
                    {quote.firstKind === "reset"
                      ? "Reset · one-time ×1.22 × 1.40"
                      : `First visit · one-time ×1.22${
                          quote.livedInMultiplier !== 1 ? " · lived-in ×1.10" : ""
                        }`}
                  </dt>
                  <dd>{cad(quote.firstRaw)}</dd>
                </div>
              </dl>
              <a className="btn btn-teal quote-cta" href="#waitlist">
                Join with this quote
              </a>
            </>
          )}
        </aside>
      </div>
    </section>
  );
}

function Stepper({
  label,
  valueLabel,
  decLabel,
  incLabel,
  onDec,
  onInc,
  decDisabled,
  incDisabled,
}: {
  label: string;
  valueLabel: string;
  decLabel: string;
  incLabel: string;
  onDec: () => void;
  onInc: () => void;
  decDisabled: boolean;
  incDisabled: boolean;
}) {
  return (
    <div className="stepper-field">
      <span className="field-label">{label}</span>
      <div className="stepper" role="group" aria-label={label}>
        <button type="button" onClick={onDec} disabled={decDisabled} aria-label={decLabel}>
          −
        </button>
        <span aria-live="polite">{valueLabel}</span>
        <button type="button" onClick={onInc} disabled={incDisabled} aria-label={incLabel}>
          +
        </button>
      </div>
    </div>
  );
}
