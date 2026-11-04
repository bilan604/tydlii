import assert from "node:assert/strict";
import { test } from "node:test";
import { SAMPLE_OFFER } from "../apps/mobile/cleaner/lib/sample-offer";
import { presentQuote } from "../apps/mobile/customer/lib/present";
import { cleanerShareAmount, quoteHome, quotePresentation, type QuoteInput } from "@tydlii/quote";

const samples: QuoteInput[] = [
  { band: "A", bedrooms: 1, fullBaths: 1, halfBaths: 0, frequency: "weekly", condition: "standard" },
  { band: "C", bedrooms: 2, fullBaths: 1, halfBaths: 0, frequency: "biweekly", condition: "standard" },
  { band: "C", bedrooms: 2, fullBaths: 1, halfBaths: 0, frequency: "biweekly", condition: "livedin" },
  { band: "G", bedrooms: 3, fullBaths: 2, halfBaths: 1, frequency: "every4", condition: "overdue" },
  { band: "V", bedrooms: 4, fullBaths: 3, halfBaths: 1, frequency: "onetime", condition: "standard" },
];

test("mobile quote math matches the website, including the Liberty Village sample", () => {
  for (const input of samples) {
    const site = quoteHome(input);
    const customer = presentQuote(input);
    const landing = quotePresentation(input);
    assert.deepEqual(customer, landing);
    assert.equal(customer.custom, false);
    assert.equal(landing.custom, false);
    if (customer.custom || landing.custom || site.custom) continue;
    assert.deepEqual(customer.quote, site);
    assert.deepEqual(landing.quote, site);
  }

  const liberty = quoteHome({
    band: "C",
    bedrooms: 2,
    fullBaths: 1,
    halfBaths: 0,
    frequency: "biweekly",
    condition: "standard",
  });
  assert.equal(liberty.custom, false);
  if (liberty.custom || !liberty.plan) return;
  assert.equal(liberty.plan.beforeHst, 229);
  assert.equal(liberty.plan.withHst, 258.77);
  assert.equal(liberty.first.beforeHst, 279);
  assert.equal(cleanerShareAmount(liberty.plan.beforeHst), 153.43);
  assert.equal(SAMPLE_OFFER.price, 349);
  assert.equal(SAMPLE_OFFER.earn, 233.83);
  assert.equal(SAMPLE_OFFER.earnAt72, 251.28);
  assert.notEqual(SAMPLE_OFFER.price, liberty.plan.beforeHst);
});
