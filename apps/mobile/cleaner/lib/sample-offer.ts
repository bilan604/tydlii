import { CLEANER_SHARE_PERCENT, DEFAULT_QUOTE_INPUT, cleanerShareAmount, quoteHome } from "@tydlii/quote";

const quote = quoteHome(DEFAULT_QUOTE_INPUT);

if (quote.custom || !quote.plan) {
  throw new Error("Sample offer is missing a plan price");
}

const price = quote.plan.beforeHst;

export const SAMPLE_OFFER = {
  area: "Liberty Village",
  address: "88 Niagara Street",
  unit: "1204",
  home: `${quote.bedrooms}-bedroom · ${quote.label}`,
  when: "Today · 9:00–11:00",
  hours: "about 3.5 hours",
  price,
  earn: cleanerShareAmount(price),
  share: `${CLEANER_SHARE_PERCENT}%`,
};
