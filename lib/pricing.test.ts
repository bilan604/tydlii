import assert from "node:assert/strict";
import { test } from "node:test";
import { SQFT_BANDS, fromPrice, quoteHome, to9, withHst, type QuoteInput } from "./pricing";

const base: QuoteInput = {
  band: "A",
  bedrooms: 1,
  fullBaths: 1,
  halfBaths: 0,
  frequency: "biweekly",
  condition: "standard",
};

test("to9 rounds to the nearest price ending in 9", () => {
  assert.equal(to9(165), 169);
  assert.equal(to9(189), 189);
  assert.equal(to9(150.15), 149);
  assert.equal(to9(181.5), 179);
  assert.equal(to9(201.3), 199);
  assert.equal(to9(209), 209);
  assert.equal(to9(339), 339);
  assert.equal(to9(184), 189);
});

test("HST is 13% of the rounded pre-tax price", () => {
  assert.equal(withHst(169), 190.97);
  assert.equal(withHst(149), 168.37);
  assert.equal(withHst(199), 224.87);
});

test("biweekly maintained band A: plan is the base rounded, first visit is one-time", () => {
  const quote = quoteHome(base);
  assert.equal(quote.custom, false);
  if (quote.custom) return;
  assert.equal(quote.subtotal, 165);
  assert.equal(quote.plan?.beforeHst, 169);
  assert.equal(quote.plan?.withHst, 190.97);
  assert.equal(quote.first.beforeHst, 199);
  assert.equal(quote.first.withHst, 224.87);
  assert.equal(quote.firstKind, "onetime");
});

test("weekly, every 4 weeks, and one-time multipliers", () => {
  const weekly = quoteHome({ ...base, frequency: "weekly" });
  const every4 = quoteHome({ ...base, frequency: "every4" });
  const once = quoteHome({ ...base, frequency: "onetime" });
  assert.equal(weekly.custom, false);
  assert.equal(every4.custom, false);
  assert.equal(once.custom, false);
  if (weekly.custom || every4.custom || once.custom) return;
  assert.equal(weekly.plan?.beforeHst, 149);
  assert.equal(weekly.first.beforeHst, 199);
  assert.equal(every4.plan?.beforeHst, 179);
  assert.equal(every4.first.beforeHst, 199);
  assert.equal(once.plan, null);
  assert.equal(once.first.beforeHst, 199);
});

test("lived-in multiplies by 1.1 and does not replace the first-visit rule", () => {
  const quote = quoteHome({ ...base, condition: "livedin" });
  assert.equal(quote.custom, false);
  if (quote.custom) return;
  if (quote.planRaw == null) throw new Error("expected a plan price");
  assert.equal(Number(quote.planRaw.toFixed(2)), 181.5);
  assert.equal(quote.plan?.beforeHst, 179);
  assert.equal(Number(quote.firstRaw.toFixed(2)), 221.43);
  assert.equal(quote.first.beforeHst, 219);
  assert.equal(quote.firstKind, "onetime");
});

test("overdue first visit is a one-time reset at 1.4, plan rate stays maintained", () => {
  const quote = quoteHome({ ...base, condition: "overdue" });
  assert.equal(quote.custom, false);
  if (quote.custom) return;
  assert.equal(quote.plan?.beforeHst, 169);
  assert.equal(quote.firstMultiplier, 1.708);
  assert.equal(Number(quote.firstRaw.toFixed(2)), 281.82);
  assert.equal(quote.first.beforeHst, 279);
  assert.equal(quote.firstKind, "reset");

  const once = quoteHome({ ...base, frequency: "onetime", condition: "overdue" });
  assert.equal(once.custom, false);
  if (once.custom) return;
  assert.equal(once.plan, null);
  assert.equal(once.first.beforeHst, 279);
});

test("extras are added before multipliers, and a studio does not go negative", () => {
  const quote = quoteHome({
    band: "C",
    bedrooms: 3,
    fullBaths: 2,
    halfBaths: 2,
    frequency: "biweekly",
    condition: "standard",
  });
  assert.equal(quote.custom, false);
  if (quote.custom) return;
  assert.equal(quote.bedroomAdd, 40);
  assert.equal(quote.fullBathAdd, 30);
  assert.equal(quote.halfBathAdd, 30);
  assert.equal(quote.subtotal, 309);
  assert.equal(quote.plan?.beforeHst, 309);
  assert.equal(quote.first.beforeHst, 379);

  const studio = quoteHome({ ...base, bedrooms: 0 });
  assert.equal(studio.custom, false);
  if (studio.custom) return;
  assert.equal(studio.bedroomAdd, 0);
  assert.equal(studio.subtotal, 165);
});

test("bands A–G keep the published bases", () => {
  const published: Record<string, number> = {
    A: 165,
    B: 189,
    C: 209,
    D: 239,
    E: 269,
    F: 299,
    G: 339,
  };
  for (const [id, basePrice] of Object.entries(published)) {
    assert.equal(SQFT_BANDS.find((band) => band.id === id)?.base, basePrice);
  }
});

test("from 1,000 sq ft up, each base is $139 plus 10 cents per sq ft of the band floor", () => {
  const floor: Record<string, number> = {
    D: 1_000,
    E: 1_300,
    F: 1_600,
    G: 2_000,
    H: 2_500,
    I: 3_000,
    J: 3_500,
    K: 4_000,
    L: 4_500,
    M: 5_000,
    N: 6_000,
    O: 7_000,
    P: 8_000,
    Q: 9_000,
    R: 10_000,
    S: 12_000,
    T: 14_000,
    U: 16_000,
    V: 18_000,
  };
  for (const band of SQFT_BANDS) {
    const start = floor[band.id];
    if (start == null) continue;
    assert.equal(band.base, 139 + start / 10, band.label);
  }
  assert.equal(SQFT_BANDS.at(-1)?.label, "18,000–20,000 sq ft");
});

test("an 8,500 sq ft home and a 20,000 sq ft home both get a real quote", () => {
  const eight = quoteHome({ ...base, band: "P" });
  assert.equal(eight.custom, false);
  if (eight.custom) return;
  assert.equal(eight.label, "8,000–8,999 sq ft");
  assert.equal(eight.base, 939);
  assert.equal(eight.plan?.beforeHst, 939);
  assert.equal(eight.plan?.withHst, 1061.07);
  assert.equal(eight.first.beforeHst, 1149);
  assert.equal(eight.first.withHst, 1298.37);

  const estate = quoteHome({ ...base, band: "V" });
  assert.equal(estate.custom, false);
  if (estate.custom) return;
  assert.equal(estate.label, "18,000–20,000 sq ft");
  assert.equal(estate.base, 1939);
  assert.equal(estate.plan?.beforeHst, 1939);
  assert.equal(estate.plan?.withHst, 2191.07);
  assert.equal(estate.first.beforeHst, 2369);
  assert.equal(estate.first.withHst, 2676.97);
});

test("every selectable band produces a non-empty plan and first-visit price", () => {
  for (const band of SQFT_BANDS) {
    const quote = quoteHome({ ...base, band: band.id });
    assert.equal(quote.custom, false, band.label);
    if (quote.custom) continue;
    assert.equal(quote.base, band.base);
    assert.ok(quote.plan && quote.plan.beforeHst > 0, band.label);
    assert.ok(quote.first.beforeHst > 0, band.label);
  }
});

test("homepage from-price is the weekly band A visit", () => {
  assert.deepEqual(fromPrice(), { beforeHst: 149, withHst: 168.37 });
});
