import {
  CLEANER_SHARE_GROWTH_PERCENT,
  CLEANER_SHARE_PERCENT,
  cleanerShareAmount,
  quoteHome,
  type QuoteInput,
} from "@tydlii/quote";

/**
 * Example larger home for this app's sample offer.
 * Keep in step with website `lib/cleaner-sample.ts` (`EXAMPLE_LARGER_HOME`).
 *
 * Band F base 299 + 2nd bedroom 20 + 2nd full bath 30 = 349.
 * Bi-weekly, maintained: plan price $349 before HST.
 * 67% = $233.83. 72% = $251.28.
 *
 * The street is the existing Liberty Village sample pin (88 Niagara Street).
 * There is no unit: this is an example larger clean, not the customer $229 condo.
 */
export const SAMPLE_HOME: QuoteInput = {
  band: "F",
  bedrooms: 2,
  fullBaths: 2,
  halfBaths: 0,
  frequency: "biweekly",
  condition: "standard",
};

const quote = quoteHome(SAMPLE_HOME);

if (quote.custom || !quote.plan) {
  throw new Error("Sample offer is missing a plan price");
}

const price = quote.plan.beforeHst;
const address = "88 Niagara Street";
const unit = "";

export const SAMPLE_OFFER = {
  example: "Example larger clean",
  area: "Liberty Village",
  address,
  unit,
  place: unit ? `${address}, ${unit}` : address,
  home: `${quote.bedrooms}-bedroom, ${quote.fullBaths} baths, ${quote.label}`,
  rhythm: `${quote.frequencyLabel} · ${quote.conditionLabel}`,
  when: "Today · 9:00–11:00",
  price,
  earn: cleanerShareAmount(price),
  earnAt72: cleanerShareAmount(price, CLEANER_SHARE_GROWTH_PERCENT),
  share: `${CLEANER_SHARE_PERCENT}%`,
  shareGrown: `${CLEANER_SHARE_GROWTH_PERCENT}%`,
};
