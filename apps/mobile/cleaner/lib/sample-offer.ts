import { quoteHome } from "@/lib/pricing";

const quote = quoteHome({
  band: "C",
  bedrooms: 2,
  fullBaths: 1,
  halfBaths: 0,
  frequency: "biweekly",
  condition: "standard",
});

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
  earn: Math.round(price * 67) / 100,
  share: "67%",
};
