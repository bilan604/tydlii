"use client";

import { useEffect, useMemo, useState } from "react";
import { cad } from "@/lib/format";
import {
  BEDROOM_OPTIONS,
  CONDITIONS,
  DEFAULT_QUOTE_INPUT,
  FREQUENCIES,
  FULL_BATH_OPTIONS,
  HALF_BATH_OPTIONS,
  QUOTE_FIELDS,
  SQFT_BANDS,
  firstVisitSentence,
  quotePresentation,
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
};

export function QuoteCalculator({ onChange }: { onChange: (snapshot: QuoteSnapshot) => void }) {
  const [band, setBand] = useState<BandId>(DEFAULT_QUOTE_INPUT.band);
  const [bedrooms, setBedrooms] = useState(DEFAULT_QUOTE_INPUT.bedrooms);
  const [fullBaths, setFullBaths] = useState(DEFAULT_QUOTE_INPUT.fullBaths);
  const [halfBaths, setHalfBaths] = useState(DEFAULT_QUOTE_INPUT.halfBaths);
  const [frequency, setFrequency] = useState<Frequency>(DEFAULT_QUOTE_INPUT.frequency);
  const [condition, setCondition] = useState<Condition>(DEFAULT_QUOTE_INPUT.condition);

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
    });
  }, [onChange, presented, band, bedrooms, fullBaths, halfBaths, frequency]);

  const headline = presented.custom ? null : presented.headline;
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
        </div>

        <aside className="quote-panel">
          <svg className="panel-art" viewBox="0 0 400 400" preserveAspectRatio="none" aria-hidden="true">
            <polygon points="300,0 400,0 400,400 200,400" fill="var(--teal)" opacity="0.22" />
          </svg>
          <div className="panel-copy">
            {presented.custom || !headline || !quote ? (
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
                  {eyebrow}: {cad(headline.beforeHst)} before HST, {cad(headline.withHst, true)} with HST.
                </p>
                <div className="price-row">
                  <span className="quote-price">{cad(headline.beforeHst)}</span>
                  <span className="price-tax">+ HST</span>
                </div>
                <p className="price-incl">{cad(headline.withHst, true)} including 13% HST</p>
                <div className="rule" />
                {presented.firstVisit ? (
                  <Check onDark>
                    {firstVisitSentence(presented.firstVisit.kind, cad(presented.firstVisit.beforeHst))}
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
