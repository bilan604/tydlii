import assert from "node:assert/strict";
import { test } from "node:test";
import { SAMPLE_OFFER } from "../apps/mobile/cleaner/lib/sample-offer";
import { presentQuote } from "../apps/mobile/customer/lib/present";
import {
  ADD_ONS,
  cleanerShareAmount,
  quoteHome,
  quotePresentation,
  stackOnLockedBase,
  type QuoteInput,
} from "@tydlii/quote";

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
    assert.equal(customer.custom, landing.custom);
    assert.equal(customer.custom, false);
    assert.equal(landing.custom, false);
    if (customer.custom || landing.custom || site.custom) continue;
    assert.deepEqual(customer.quote, site);
    assert.deepEqual(landing.quote, site);
    assert.deepEqual(customer.headline, landing.headline);
    assert.equal(customer.first.lines.length, 0);
    assert.equal(customer.first.beforeHst, site.first.beforeHst);
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

  const counts = { fridge: 1, windows: 1, blinds: 3, linens: 2, pets: 1 };
  const stacked = stackOnLockedBase(liberty.plan.beforeHst, counts);
  assert.equal(ADD_ONS.length, 9);
  assert.equal(stacked.baseBeforeHst, 229);
  assert.equal(stacked.beforeHst, 229 + 29 + 39 + 24 + 30 + 29);
  assert.equal(stackOnLockedBase(229).beforeHst, 229);
  const withAddOns = presentQuote({
    band: "C",
    bedrooms: 2,
    fullBaths: 1,
    halfBaths: 0,
    frequency: "biweekly",
    condition: "standard",
    addOns: counts,
  });
  assert.equal(withAddOns.custom, false);
  if (withAddOns.custom) return;
  assert.equal(withAddOns.quote.plan?.beforeHst, 229);
  assert.equal(withAddOns.headline.beforeHst, stacked.beforeHst);
  assert.equal(withAddOns.first.beforeHst, 279 + stacked.addOnsBeforeHst);
});