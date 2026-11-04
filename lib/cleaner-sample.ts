import {
  CLEANER_SHARE_GROWTH_PERCENT,
  CLEANER_SHARE_PERCENT,
  cleanerShareAmount,
  quoteHome,
  type QuoteInput,
} from "./pricing";

/**
 * Example larger home for cleaner-facing samples only.
 * Not the customer quote default.
 *
 * Band F, 1,600–1,999 sq ft, base 299.
 * 2 bedrooms (+20) and 2 full baths (+30), no half bath.
 * Subtotal 349. Bi-weekly × maintained is ×1, so the plan is $349 before HST.
 * 67% of 349 is $233.83. 72% of 349 is $251.28.
 */
export const EXAMPLE_LARGER_HOME: QuoteInput = {
  band: "F",
  bedrooms: 2,
  fullBaths: 2,
  halfBaths: 0,
  frequency: "biweekly",
  condition: "standard",
};

function exampleQuote() {
  const quote = quoteHome(EXAMPLE_LARGER_HOME);
  if (quote.custom || quote.plan == null) {
    throw new Error("Example larger home is missing a plan price");
  }
  return { quote, plan: quote.plan };
}

const { quote, plan } = exampleQuote();
const beforeHst = plan.beforeHst;

export const EXAMPLE_LARGER_CLEAN = {
  quote,
  beforeHst,
  dayOne: cleanerShareAmount(beforeHst, CLEANER_SHARE_PERCENT),
  grown: cleanerShareAmount(beforeHst, CLEANER_SHARE_GROWTH_PERCENT),
  /** Matches the cleaner app sample card. */
  homeLine: `${quote.bedrooms}-bedroom, ${quote.fullBaths} baths, ${quote.label}`,
  rhythm: `${quote.frequencyLabel}, ${quote.conditionLabel.toLowerCase()}`,
};
