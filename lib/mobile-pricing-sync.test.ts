import assert from "node:assert/strict";
import { test } from "node:test";
import * as cleaner from "../apps/mobile/cleaner/lib/pricing";
import * as customer from "../apps/mobile/customer/lib/pricing";
import { quoteHome, type QuoteInput } from "./pricing";

const samples: QuoteInput[] = [
  { band: "A", bedrooms: 1, fullBaths: 1, halfBaths: 0, frequency: "weekly", condition: "standard" },
  { band: "C", bedrooms: 2, fullBaths: 1, halfBaths: 0, frequency: "biweekly", condition: "standard" },
  { band: "C", bedrooms: 2, fullBaths: 1, halfBaths: 0, frequency: "biweekly", condition: "livedin" },
  { band: "G", bedrooms: 3, fullBaths: 2, halfBaths: 1, frequency: "every4", condition: "overdue" },
  { band: "V", bedrooms: 4, fullBaths: 3, halfBaths: 1, frequency: "onetime", condition: "standard" },
];

test("mobile quote math matches the website, including the Liberty Village sample", () => {
  for (const input of samples) {
    assert.deepEqual(customer.quoteHome(input), quoteHome(input));
    assert.deepEqual(cleaner.quoteHome(input), quoteHome(input));
  }
  assert.deepEqual(customer.SQFT_BANDS, cleaner.SQFT_BANDS);

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
  assert.equal(Math.round(liberty.plan.beforeHst * 67) / 100, 153.43);
});
