"use client";

import { useEffect, useMemo, useState } from "react";
import { cad } from "@/lib/format";
import {
  ADD_ONS,
  BEDROOM_OPTIONS,
  CONDITIONS,
  DEFAULT_QUOTE_INPUT,
  FREQUENCIES,
  FULL_BATH_OPTIONS,
  HALF_BATH_OPTIONS,
  QUOTE_FIELDS,
  SQFT_BANDS,
  addOnLineLabel,
  emptyAddOns,
  firstVisitSentence,
  quotePresentation,
  stackOnLockedBase,
  type AddOnCounts,
  type AddOnId,
  type BandId,
  type Condition,
  type Frequency,
  type Quote,
} from "@/lib/pricing";
import { Check, SectionIntro } from "./ui";

export { DEFAULT_QUOTE_INPUT };

export type QuoteSnapshot = {
  quote: Quote;
  bedrooms: number;
  fullBaths: number;
  halfBaths: number;
  frequency: Frequency;
  addOns: AddOnCounts;
};

export function QuoteCalculator({ onChange }: { onChange: (snapshot: QuoteSnapshot) => void }) {
  const [band, setBand] = useState<BandId>(DEFAULT_QUOTE_INPUT.band);
  const [bedrooms, setBedrooms] = useState(DEFAULT_QUOTE_INPUT.bedrooms);
  const [fullBaths, setFullBaths] = useState(DEFAULT_QUOTE_INPUT.fullBaths);
  const [halfBaths, setHalfBaths] = useState(DEFAULT_QUOTE_INPUT.halfBaths);
  const [frequency, setFrequency] = useState<Frequency>(DEFAULT_QUOTE_INPUT.frequency);
  const [condition, setCondition] = useState<Condition>(DEFAULT_QUOTE_INPUT.condition);
  const [addOns, setAddOns] = useState<AddOnCounts>(emptyAddOns);

  const presented = useMemo(
    () => quotePresentation({ band, bedrooms, fullBaths, halfBaths, frequency, condition }),
    [band, bedrooms, fullBaths, halfBaths, frequency, condition],
  );
  const quote = presented.custom ? null : presented.quote;

  useEffect(() => {
    onChange({
      quote: presented.custom ? { custom: true, band, label: presented.label } : presented.quote,
      bedrooms,
      fullBaths,
      halfBaths,
      frequency,
      addOns,
    });
  }, [onChange, presented, band, bedrooms, fullBaths, halfBaths, frequency, addOns]);

  function setAddOn(id: AddOnId, quantity: number) {
    const addOn = ADD_ONS.find((item) => item.id === id);
    if (!addOn) return;
    const next = Math.min(addOn.max, Math.max(0, quantity));
    setAddOns((current) => ({ ...current, [id]: next }));
  }

  const headline = presented.custom ? null : presented.headline;
  const stacked = headline ? stackOnLockedBase(headline.beforeHst, addOns) : null;
  const firstStacked = presented.custom ? null : stackOnLockedBase(presented.quote.first.beforeHst, addOns);
  const eyebrow = presented.custom ? presented.label : presented.eyebrow;

  return (
    <section className="block tight" id="price" aria-labelledby="quote-title">
      <SectionIntro
        titleId="quote-title"
        kicker="Instant price"
        title="Your price, in seconds."
        sub="Locked before you book. Prices shown before HST; Ontario HST (13%) is added at checkout."
      />
      <div className="quote-split">
        <div className="quote-form">
          <h3>Tell us about your home</h3>
          <div className="form-grid">
            <label className="field">
              <span>{QUOTE_FIELDS.bedrooms}</span>
              <select value={bedrooms} onChange={(event) => setBedrooms(Number(event.target.value))}>
                {BEDROOM_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>{QUOTE_FIELDS.fullBaths}</span>
              <select value={fullBaths} onChange={(event) => setFullBaths(Number(event.target.value))}>
                {FULL_BATH_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>{QUOTE_FIELDS.halfBaths}</span>
              <select value={halfBaths} onChange={(event) => setHalfBaths(Number(event.target.value))}>
                {HALF_BATH_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>{QUOTE_FIELDS.band}</span>
              <select value={band} onChange={(event) => setBand(event.target.value as BandId)}>
                {SQFT_BANDS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>{QUOTE_FIELDS.frequency}</span>
              <select value={frequency} onChange={(event) => setFrequency(event.target.value as Frequency)}>
                {FREQUENCIES.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>{QUOTE_FIELDS.condition}</span>
              <select value={condition} onChange={(event) => setCondition(event.target.value as Condition)}>
                {CONDITIONS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <fieldset className="addon-list">
            <legend>Add-ons</legend>
            <p className="addon-note">Before HST. Each one is added to the locked price.</p>
            {ADD_ONS.map((addOn) => {
              const count = addOns[addOn.id];
              const counted = addOn.unit === "window" || addOn.unit === "bed";
              if (!counted) {
                return (
                  <label key={addOn.id} className={count > 0 ? "addon is-on" : "addon"}>
                    <input
                      type="checkbox"
                      checked={count > 0}
                      onChange={(event) => setAddOn(addOn.id, event.target.checked ? 1 : 0)}
                    />
                    <span className="addon-copy">
                      <span className="addon-name">
                        {addOn.label} <span className="addon-price">{addOn.menuPrice}</span>
                      </span>
                      <span className="addon-inclusion">{addOn.inclusion}</span>
                    </span>
                  </label>
                );
              }
              return (
                <div key={addOn.id} className={count > 0 ? "addon is-on" : "addon"}>
                  <div className="addon-copy">
                    <span className="addon-name">
                      {addOn.label} <span className="addon-price">{addOn.menuPrice}</span>
                    </span>
                    <span className="addon-inclusion">{addOn.inclusion}</span>
                  </div>
                  <div className="addon-step">
                    <button
                      type="button"
                      aria-label={`Fewer ${addOn.label}`}
                      disabled={count <= 0}
                      onClick={() => setAddOn(addOn.id, count - 1)}
                    >
                      −
                    </button>
                    <span>{count}</span>
                    <button
                      type="button"
                      aria-label={`More ${addOn.label}`}
                      disabled={count >= addOn.max}
                      onClick={() => setAddOn(addOn.id, count + 1)}
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </fieldset>
        </div>

        <aside className="quote-panel">
          <svg className="panel-art" viewBox="0 0 400 400" preserveAspectRatio="none" aria-hidden="true">
            <polygon points="300,0 400,0 400,400 200,400" fill="var(--teal)" opacity="0.22" />
          </svg>
          <div className="panel-copy">
            {presented.custom || !headline || !stacked || !quote ? (
              <>
                <p className="eyebrow on-dark">{presented.custom ? presented.label : "Custom"}</p>
                <h3 className="custom-title">A custom, guaranteed quote.</h3>
                <p>
                  Larger homes get a fixed price from a short video walkthrough. Join the waitlist and
                  we&apos;ll be in touch.
                </p>
              </>
            ) : (
              <>
                <p className="eyebrow on-dark">{eyebrow}</p>
                <p className="sr" aria-live="polite">
                  {eyebrow}: {cad(stacked.beforeHst)} before HST, {cad(stacked.withHst, true)} with HST.
                  {stacked.lines.length > 0
                    ? ` Locked clean ${cad(stacked.baseBeforeHst)}. ${stacked.lines
                        .map((line) => `${addOnLineLabel(line)} ${cad(line.amount)}`)
                        .join(", ")}.`
                    : ""}
                </p>
                <div className="price-row">
                  <span className={stacked.lines.length > 0 ? "quote-price is-detailed" : "quote-price"}>
                    {cad(stacked.beforeHst)}
                  </span>
                  <span className="price-tax">+ HST</span>
                </div>
                <p className="price-incl">{cad(stacked.withHst, true)} including 13% HST</p>
                {stacked.lines.length > 0 ? (
                  <ul className="quote-lines">
                    <li>
                      <span>Locked clean</span>
                      <span>{cad(stacked.baseBeforeHst)}</span>
                    </li>
                    {stacked.lines.map((line) => (
                      <li key={line.id}>
                        <span>{addOnLineLabel(line)}</span>
                        <span>{cad(line.amount)}</span>
                      </li>
                    ))}
                    <li className="is-total">
                      <span>Total before HST</span>
                      <span>{cad(stacked.beforeHst)}</span>
                    </li>
                  </ul>
                ) : null}
                <div className="rule" />
                {presented.firstVisit && firstStacked ? (
                  <Check onDark>
                    {firstStacked.lines.length > 0
                      ? `${presented.firstVisit.kind === "reset" ? "First visit is a deep Reset clean: " : "First visit is a deeper clean: "}${cad(firstStacked.beforeHst)} + HST, locked clean ${cad(firstStacked.baseBeforeHst)} plus add-ons. Your plan price starts from visit two.`
                      : firstVisitSentence(presented.firstVisit.kind, cad(presented.firstVisit.beforeHst))}
                  </Check>
                ) : null}
                <Check onDark>
                  The price you see is the price you pay. If your home differs a lot from what you booked, we
                  call before we start.
                </Check>
              </>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}
