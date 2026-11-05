import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CleanerPitch } from "../components/CleanerPitch";
import { DEFAULT_QUOTE_INPUT } from "../components/QuoteCalculator";
import { DEFAULT_DRAFT } from "../apps/mobile/customer/lib/draft";
import { SAMPLE_HOME, SAMPLE_OFFER } from "../apps/mobile/cleaner/lib/sample-offer";
import { cad } from "./format";
import { quoteHome } from "./pricing";
import { EXAMPLE_LARGER_CLEAN, EXAMPLE_LARGER_HOME } from "./cleaner-sample";

test("the example larger home is a real $349 plan, and cleaner share is 67% and 72% of that", () => {
  assert.deepEqual(SAMPLE_HOME, EXAMPLE_LARGER_HOME);
  assert.equal(EXAMPLE_LARGER_CLEAN.quote.custom, false);
  assert.equal(EXAMPLE_LARGER_CLEAN.quote.base, 299);
  assert.equal(EXAMPLE_LARGER_CLEAN.quote.subtotal, 349);
  assert.equal(EXAMPLE_LARGER_CLEAN.quote.planRaw, 349);
  assert.equal(EXAMPLE_LARGER_CLEAN.beforeHst, 349);
  assert.equal(EXAMPLE_LARGER_CLEAN.quote.plan?.withHst, 394.37);
  assert.equal(EXAMPLE_LARGER_CLEAN.dayOne, 233.83);
  assert.equal(EXAMPLE_LARGER_CLEAN.grown, 251.28);
  assert.equal(EXAMPLE_LARGER_CLEAN.homeLine, "2-bedroom, 2 baths, 1,600–1,999 sq ft");
  assert.equal(EXAMPLE_LARGER_CLEAN.rhythm, "Bi-weekly, maintained");

  assert.equal(SAMPLE_OFFER.price, 349);
  assert.equal(SAMPLE_OFFER.earn, 233.83);
  assert.equal(SAMPLE_OFFER.earnAt72, 251.28);
  assert.equal(SAMPLE_OFFER.share, "67%");
  assert.equal(SAMPLE_OFFER.shareGrown, "72%");
  assert.match(SAMPLE_OFFER.example, /example larger clean/i);
});

test("the cleaner pitch shows that example, and the customer default stays $229", () => {
  const html = renderToStaticMarkup(createElement(CleanerPitch));
  assert.match(html, /Example larger clean/);
  assert.match(html, /2-bedroom, 2 baths, 1,600–1,999 sq ft/);
  assert.match(html, /Bi-weekly, maintained/);
  assert.match(html, /before HST/);
  assert.ok(html.includes(cad(EXAMPLE_LARGER_CLEAN.beforeHst)));
  assert.ok(html.includes(cad(EXAMPLE_LARGER_CLEAN.dayOne, true)));
  assert.ok(html.includes(cad(EXAMPLE_LARGER_CLEAN.grown, true)));
  assert.match(html, /67% yours from day one/);
  assert.match(html, /up to 72%/);
  assert.doesNotMatch(html, /\$229/);
  assert.doesNotMatch(html, /153\.43/);
  assert.doesNotMatch(html, /3\.5 hours/);

  const customer = quoteHome(DEFAULT_QUOTE_INPUT);
  assert.equal(customer.custom, false);
  if (customer.custom || !customer.plan) return;
  assert.equal(customer.plan.beforeHst, 229);
  assert.equal(customer.plan.withHst, 258.77);
  assert.deepEqual(
    {
      band: DEFAULT_DRAFT.band,
      bedrooms: DEFAULT_DRAFT.bedrooms,
      fullBaths: DEFAULT_DRAFT.fullBaths,
      halfBaths: DEFAULT_DRAFT.halfBaths,
      frequency: DEFAULT_DRAFT.frequency,
      condition: DEFAULT_DRAFT.condition,
    },
    DEFAULT_QUOTE_INPUT,
  );
});

test("the customer hero preview is still the $229 clean", async () => {
  const hero = await readFile(new URL("../components/Hero.tsx", import.meta.url), "utf8");
  assert.match(hero, /\$229 <span>\+ HST<\/span>/);
});
