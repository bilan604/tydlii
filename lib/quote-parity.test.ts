import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { presentQuote } from "../apps/mobile/customer/lib/present";
import { DEFAULT_DRAFT } from "../apps/mobile/customer/lib/draft";
import { SAMPLE_OFFER } from "../apps/mobile/cleaner/lib/sample-offer";
import * as site from "./pricing";
import {
  BEDROOM_OPTIONS,
  CLEANER_SHARE_GROWTH_PERCENT,
  CLEANER_SHARE_PERCENT,
  CONDITIONS,
  DEFAULT_QUOTE_INPUT,
  FREQUENCIES,
  FULL_BATH_OPTIONS,
  HALF_BATH_OPTIONS,
  HST_RATE,
  QUOTE_FIELDS,
  SQFT_BANDS,
  cleanerShareAmount,
  firstVisitSentence,
  quoteHome,
  quotePresentation,
  withHst,
  type Condition,
  type Frequency,
  type QuoteInput,
} from "@tydlii/quote";

/**
 * Option strings copied from the live quote form at https://www.tydlii.com/.
 * The customer app and the landing both render the shared catalog, so this list
 * is the contract those two surfaces have to keep.
 */
const LIVE_SQFT_LABELS = [
  "Under 600 sq ft",
  "600–799 sq ft",
  "800–999 sq ft",
  "1,000–1,299 sq ft",
  "1,300–1,599 sq ft",
  "1,600–1,999 sq ft",
  "2,000–2,499 sq ft",
  "2,500–2,999 sq ft",
  "3,000–3,499 sq ft",
  "3,500–3,999 sq ft",
  "4,000–4,499 sq ft",
  "4,500–4,999 sq ft",
  "5,000–5,999 sq ft",
  "6,000–6,999 sq ft",
  "7,000–7,999 sq ft",
  "8,000–8,999 sq ft",
  "9,000–9,999 sq ft",
  "10,000–11,999 sq ft",
  "12,000–13,999 sq ft",
  "14,000–15,999 sq ft",
  "16,000–17,999 sq ft",
  "18,000–20,000 sq ft",
];

const LIVE_FREQUENCIES = ["Weekly", "Bi-weekly", "Every 4 weeks", "One-time"];
const LIVE_CONDITIONS = ["Maintained", "Lived-in (pets, kids, 4+ wks)", "Overdue (needs a reset)"];

function landingHeadline(input: QuoteInput) {
  const quote = quoteHome(input);
  assert.equal(quote.custom, false);
  if (quote.custom) throw new Error("expected a priced quote");
  if (input.frequency === "onetime" || quote.plan == null) return quote.first;
  return quote.plan;
}

test("the website re-exports the shared quote package", () => {
  assert.equal(site.HST_RATE, HST_RATE);
  assert.equal(site.CLEANER_SHARE_PERCENT, CLEANER_SHARE_PERCENT);
  assert.deepEqual(site.SQFT_BANDS, SQFT_BANDS);
  assert.deepEqual(site.FREQUENCIES, FREQUENCIES);
  assert.deepEqual(site.CONDITIONS, CONDITIONS);
  assert.deepEqual(site.DEFAULT_QUOTE_INPUT, DEFAULT_QUOTE_INPUT);
  assert.equal(readFileSync("lib/pricing.ts", "utf8").includes('from "@tydlii/quote"'), true);
  assert.equal(readFileSync("lib/pricing.ts", "utf8").includes("base: 165"), false);
});

test("landing and app options match the live tydlii.com quote form", () => {
  assert.deepEqual(
    SQFT_BANDS.map((band) => band.label),
    LIVE_SQFT_LABELS,
  );
  assert.equal(SQFT_BANDS.at(-1)?.id, "V");
  assert.deepEqual(
    FREQUENCIES.map((item) => item.label),
    LIVE_FREQUENCIES,
  );
  assert.deepEqual(
    FREQUENCIES.map((item) => item.multiplier),
    [0.91, 1, 1.1, 1.22],
  );
  assert.deepEqual(
    CONDITIONS.map((item) => item.label),
    LIVE_CONDITIONS,
  );
  assert.deepEqual([...BEDROOM_OPTIONS], [1, 2, 3, 4, 5]);
  assert.deepEqual([...FULL_BATH_OPTIONS], [1, 2, 3, 4]);
  assert.deepEqual([...HALF_BATH_OPTIONS], [0, 1, 2]);
  assert.deepEqual(QUOTE_FIELDS, {
    bedrooms: "Bedrooms (den counts as one)",
    fullBaths: "Full bathrooms",
    halfBaths: "Half bathrooms",
    band: "Home size",
    frequency: "How often",
    condition: "Condition today",
  });
});

test("the default home matches the live landing price and the cleaner share", () => {
  const presented = quotePresentation(DEFAULT_QUOTE_INPUT);
  assert.equal(presented.custom, false);
  if (presented.custom) return;
  assert.equal(presented.eyebrow, "Bi-weekly · per visit");
  assert.deepEqual(presented.headline, { beforeHst: 229, withHst: 258.77 });
  assert.deepEqual(presented.firstVisit, { kind: "deeper", beforeHst: 279, withHst: 315.27 });
  assert.equal(presented.quote.frequencyLabel, "Bi-weekly");
  assert.equal(presented.quote.conditionLabel, "Maintained");
  assert.equal(withHst(presented.headline.beforeHst), 258.77);
  assert.equal(HST_RATE, 0.13);

  const share = site.landingPreviewShare();
  assert.deepEqual(share, { visitBeforeHst: 229, share: 153.43 });
  assert.equal(cleanerShareAmount(229), 153.43);
  assert.equal(CLEANER_SHARE_PERCENT, 67);
  assert.equal(CLEANER_SHARE_GROWTH_PERCENT, 72);
  assert.notEqual(cleanerShareAmount(presented.headline.withHst), 153.43);
  assert.equal(
    firstVisitSentence("deeper", "$279"),
    "First visit is a deeper clean: $279 + HST. Your plan price starts from visit two.",
  );
  assert.equal(
    firstVisitSentence("reset", "$279"),
    "First visit is a deep Reset clean: $279 + HST. Your plan price starts from visit two.",
  );
});

test("customer presentation, landing presentation, and checkout price agree for the same inputs", () => {
  const bedrooms = [BEDROOM_OPTIONS[0], BEDROOM_OPTIONS[BEDROOM_OPTIONS.length - 1]];
  const fullBaths = [FULL_BATH_OPTIONS[0], FULL_BATH_OPTIONS[FULL_BATH_OPTIONS.length - 1]];
  const halfBaths = [HALF_BATH_OPTIONS[0], HALF_BATH_OPTIONS[HALF_BATH_OPTIONS.length - 1]];

  for (const band of SQFT_BANDS) {
    for (const frequency of FREQUENCIES) {
      for (const condition of CONDITIONS) {
        for (const beds of bedrooms) {
          for (const baths of fullBaths) {
            for (const halves of halfBaths) {
              const input: QuoteInput = {
                band: band.id,
                bedrooms: beds,
                fullBaths: baths,
                halfBaths: halves,
                frequency: frequency.id as Frequency,
                condition: condition.id as Condition,
              };
              const landing = quotePresentation(input);
              const customer = presentQuote(input);
              const siteQuote = site.quoteHome(input);
              assert.deepEqual(customer, landing, `${band.label} ${frequency.label} ${condition.label}`);
              assert.deepEqual(landing.custom ? null : landing.quote, siteQuote.custom ? null : siteQuote);
              assert.equal(landing.custom, false);
              if (landing.custom || siteQuote.custom) continue;
              assert.deepEqual(landing.headline, landingHeadline(input));
              assert.equal(landing.quote.label, band.label);
              assert.equal(landing.quote.frequencyLabel, frequency.label);
              assert.equal(landing.quote.conditionLabel, condition.label);
              assert.equal(landing.quote.first.withHst, withHst(landing.quote.first.beforeHst));
              if (landing.quote.plan) {
                assert.equal(landing.quote.plan.withHst, withHst(landing.quote.plan.beforeHst));
              }
              if (landing.firstVisit) {
                assert.equal(landing.firstVisit.beforeHst, landing.quote.first.beforeHst);
                assert.equal(landing.firstVisit.withHst, landing.quote.first.withHst);
              } else {
                assert.equal(landing.headline.beforeHst, landing.quote.first.beforeHst);
              }
            }
          }
        }
      }
    }
  }
});

test("the customer draft stays on the landing preview, and the cleaner sample is the larger home", () => {
  assert.equal(DEFAULT_DRAFT.band, DEFAULT_QUOTE_INPUT.band);
  assert.equal(DEFAULT_DRAFT.bedrooms, DEFAULT_QUOTE_INPUT.bedrooms);
  assert.equal(DEFAULT_DRAFT.fullBaths, DEFAULT_QUOTE_INPUT.fullBaths);
  assert.equal(DEFAULT_DRAFT.halfBaths, DEFAULT_QUOTE_INPUT.halfBaths);
  assert.equal(DEFAULT_DRAFT.frequency, DEFAULT_QUOTE_INPUT.frequency);
  assert.equal(DEFAULT_DRAFT.condition, DEFAULT_QUOTE_INPUT.condition);

  const presented = presentQuote(DEFAULT_QUOTE_INPUT);
  assert.equal(presented.custom, false);
  if (presented.custom || !presented.quote.plan) return;
  assert.equal(presented.quote.plan.beforeHst, 229);
  assert.equal(presented.quote.plan.withHst, 258.77);
  assert.equal(SAMPLE_OFFER.price, 349);
  assert.equal(SAMPLE_OFFER.earn, cleanerShareAmount(SAMPLE_OFFER.price));
  assert.equal(SAMPLE_OFFER.earnAt72, cleanerShareAmount(SAMPLE_OFFER.price, CLEANER_SHARE_GROWTH_PERCENT));
  assert.equal(SAMPLE_OFFER.share, `${CLEANER_SHARE_PERCENT}%`);
  assert.equal(SAMPLE_OFFER.shareGrown, `${CLEANER_SHARE_GROWTH_PERCENT}%`);
  assert.notEqual(SAMPLE_OFFER.price, presented.quote.plan.beforeHst);
});

test("the landing and the apps do not keep a second price table", () => {
  assert.equal(existsSync("apps/mobile/customer/lib/pricing.ts"), false);
  assert.equal(existsSync("apps/mobile/cleaner/lib/pricing.ts"), false);

  const calculator = readFileSync("components/QuoteCalculator.tsx", "utf8");
  assert.equal(calculator.includes("quotePresentation"), true);
  assert.equal(calculator.includes('label: "Bi-weekly"'), false);
  assert.equal(calculator.includes("BEDROOM_OPTIONS"), true);
  assert.equal(calculator.includes("SQFT_BANDS"), true);

  const book = readFileSync("apps/mobile/customer/app/book.tsx", "utf8");
  for (const token of [
    "BEDROOM_OPTIONS",
    "FULL_BATH_OPTIONS",
    "HALF_BATH_OPTIONS",
    "SQFT_BANDS",
    "FREQUENCIES",
    "CONDITIONS",
    "QUOTE_FIELDS",
    "firstVisitSentence",
    "presentQuote",
    "@tydlii/quote",
  ]) {
    assert.equal(book.includes(token), true, token);
  }
  assert.equal(book.includes("base: 165"), false);
  assert.equal(/max=\{[0-9]+\}/.test(book), false);

  const pitch = readFileSync("components/CleanerPitch.tsx", "utf8");
  assert.equal(pitch.includes("EXAMPLE_LARGER_CLEAN"), true);
  assert.equal(pitch.includes("CLEANER_SHARE_PERCENT"), true);
  assert.equal(pitch.includes("153.43"), false);
  assert.equal(pitch.includes("$229"), false);

  const offer = readFileSync("apps/mobile/cleaner/lib/sample-offer.ts", "utf8");
  assert.equal(offer.includes("@tydlii/quote"), true);
  assert.equal(offer.includes("cleanerShareAmount"), true);
  assert.equal(offer.includes("SAMPLE_HOME"), true);
  assert.equal(offer.includes("DEFAULT_QUOTE_INPUT"), false);
  assert.equal(offer.includes("153.43"), false);
});
