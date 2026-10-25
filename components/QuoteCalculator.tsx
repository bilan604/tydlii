"use client";

import { useEffect, useMemo, useState } from "react";
import { cad } from "@/lib/format";
import {
  SQFT_BANDS,
  quoteHome,
  type BandId,
  type Condition,
  type Frequency,
  type Quote,
  type QuoteInput,
} from "@/lib/pricing";
import { Check, SectionIntro } from "./ui";

export const DEFAULT_QUOTE_INPUT: QuoteInput = {
  band: "C",
  bedrooms: 2,
  fullBaths: 1,
  halfBaths: 0,
  frequency: "biweekly",
  condition: "standard",
};

export type QuoteSnapshot = {
  quote: Quote;
  bedrooms: number;
  fullBaths: number;
  halfBaths: number;
  frequency: Frequency;
};

const FREQUENCIES: { id: Frequency; label: string }[] = [
  { id: "weekly", label: "Weekly" },
  { id: "biweekly", label: "Bi-weekly" },
  { id: "every4", label: "Every 4 weeks" },
  { id: "onetime", label: "One-time" },
];

const CONDITIONS: { id: Condition; label: string }[] = [
  { id: "standard", label: "Maintained" },
  { id: "livedin", label: "Lived-in (pets, kids, 4+ wks)" },
  { id: "overdue", label: "Overdue (needs a reset)" },
];

const FREQ_LABEL: Record<Frequency, string> = {
  weekly: "Weekly",
  biweekly: "Bi-weekly",
  every4: "Every 4 weeks",
  onetime: "One-time",
};

export function QuoteCalculator({ onChange }: { onChange: (snapshot: QuoteSnapshot) => void }) {
  const [band, setBand] = useState<BandId>(DEFAULT_QUOTE_INPUT.band);
  const [bedrooms, setBedrooms] = useState(DEFAULT_QUOTE_INPUT.bedrooms);
  const [fullBaths, setFullBaths] = useState(DEFAULT_QUOTE_INPUT.fullBaths);
  const [halfBaths, setHalfBaths] = useState(DEFAULT_QUOTE_INPUT.halfBaths);
  const [frequency, setFrequency] = useState<Frequency>(DEFAULT_QUOTE_INPUT.frequency);
  const [condition, setCondition] = useState<Condition>(DEFAULT_QUOTE_INPUT.condition);

  const quote = useMemo(
    () => quoteHome({ band, bedrooms, fullBaths, halfBaths, frequency, condition }),
    [band, bedrooms, fullBaths, halfBaths, frequency, condition],
  );

  useEffect(() => {
    onChange({ quote, bedrooms, fullBaths, halfBaths, frequency });
  }, [onChange, quote, bedrooms, fullBaths, halfBaths, frequency]);

  const headline = quote.custom ? null : frequency === "onetime" || !quote.plan ? quote.first : quote.plan;
  const eyebrow = quote.custom
    ? quote.label
    : frequency === "onetime"
      ? quote.firstKind === "reset"
        ? "One-time reset clean"
        : "One-time clean"
      : `${FREQ_LABEL[frequency]} · per visit`;

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
              <span>Bedrooms (den counts as one)</span>
              <select value={bedrooms} onChange={(event) => setBedrooms(Number(event.target.value))}>
                {[1, 2, 3, 4, 5].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Full bathrooms</span>
              <select value={fullBaths} onChange={(event) => setFullBaths(Number(event.target.value))}>
                {[1, 2, 3, 4].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Half bathrooms</span>
              <select value={halfBaths} onChange={(event) => setHalfBaths(Number(event.target.value))}>
                {[0, 1, 2].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Home size</span>
              <select value={band} onChange={(event) => setBand(event.target.value as BandId)}>
                {SQFT_BANDS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>How often</span>
              <select value={frequency} onChange={(event) => setFrequency(event.target.value as Frequency)}>
                {FREQUENCIES.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Condition today</span>
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
            {quote.custom || !headline ? (
              <>
                <p className="eyebrow on-dark">{quote.custom ? quote.label : "Custom"}</p>
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
                {frequency !== "onetime" ? (
                  <Check onDark>
                    {quote.firstKind === "reset"
                      ? "First visit is a deep Reset clean: "
                      : "First visit is a deeper clean: "}
                    {cad(quote.first.beforeHst)} + HST. Your plan price starts from visit two.
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
