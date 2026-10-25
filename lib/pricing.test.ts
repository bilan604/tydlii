import assert from "node:assert/strict";
import { test } from "node:test";
import { fromPrice, quoteHome, to9, withHst, type QuoteInput } from "./pricing";

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

test("band H is a custom quote with no price", () => {
  const quote = quoteHome({ ...base, band: "H" });
  assert.deepEqual(quote, { custom: true, band: "H", label: "2,500+ sq ft" });
});

test("homepage from-price is the weekly band A visit", () => {
  assert.deepEqual(fromPrice(), { beforeHst: 149, withHst: 168.37 });
});
