/**
 * Instant quote math from the Tydlii landing brief, extended through 20,000 sq ft.
 *
 * Bands A–C keep the published bases: 165, 189, 209.
 * From band D up, base = 139 + $0.10 × the band floor. That line is the brief for
 * D–G (239, 269, 299, 339) and the same formula prices every larger band.
 * +20 per bedroom after the first, +30 per full bath after the first, +15 per half bath
 * Frequency: weekly 0.91, biweekly 1.0, every 4 weeks 1.1, one-time 1.22
 * Lived-in ×1.1
 * Overdue first visit = one-time × 1.4 (a reset). Otherwise the first visit is the one-time rate.
 * Round the charged pre-tax amount to the nearest price ending in 9 (`to9`).
 * Show that amount before HST, and again with 13% HST.
 *
 * Sq ft cut points label those bases. They are the public bands. A null base would
 * be a custom quote; every published band has a price.
 */

export const HST_RATE = 0.13;

export const SQFT_BANDS = [
  { id: "A", label: "Under 600 sq ft", base: 165 },
  { id: "B", label: "600–799 sq ft", base: 189 },
  { id: "C", label: "800–999 sq ft", base: 209 },
  { id: "D", label: "1,000–1,299 sq ft", base: 239 },
  { id: "E", label: "1,300–1,599 sq ft", base: 269 },
  { id: "F", label: "1,600–1,999 sq ft", base: 299 },
  { id: "G", label: "2,000–2,499 sq ft", base: 339 },
  { id: "H", label: "2,500–2,999 sq ft", base: 389 },
  { id: "I", label: "3,000–3,499 sq ft", base: 439 },
  { id: "J", label: "3,500–3,999 sq ft", base: 489 },
  { id: "K", label: "4,000–4,499 sq ft", base: 539 },
  { id: "L", label: "4,500–4,999 sq ft", base: 589 },
  { id: "M", label: "5,000–5,999 sq ft", base: 639 },
  { id: "N", label: "6,000–6,999 sq ft", base: 739 },
  { id: "O", label: "7,000–7,999 sq ft", base: 839 },
  { id: "P", label: "8,000–8,999 sq ft", base: 939 },
  { id: "Q", label: "9,000–9,999 sq ft", base: 1039 },
  { id: "R", label: "10,000–11,999 sq ft", base: 1139 },
  { id: "S", label: "12,000–13,999 sq ft", base: 1339 },
  { id: "T", label: "14,000–15,999 sq ft", base: 1539 },
  { id: "U", label: "16,000–17,999 sq ft", base: 1739 },
  { id: "V", label: "18,000–20,000 sq ft", base: 1939 },
] as const;

export type BandId = (typeof SQFT_BANDS)[number]["id"];

export const FREQUENCIES = [
  { id: "weekly", label: "Weekly", multiplier: 0.91, hint: "Same weekday" },
  { id: "biweekly", label: "Every 2 weeks", multiplier: 1, hint: "Most homes" },
  { id: "every4", label: "Every 4 weeks", multiplier: 1.1, hint: "A lighter rhythm" },
  { id: "onetime", label: "One-time", multiplier: 1.22, hint: "A single visit" },
] as const;

export type Frequency = (typeof FREQUENCIES)[number]["id"];

export const CONDITIONS = [
  {
    id: "standard",
    label: "Maintained",
    hint: "The home is already on a regular clean.",
  },
  {
    id: "livedin",
    label: "Lived-in",
    hint: "Everyday mess. Priced at 1.1×.",
  },
  {
    id: "overdue",
    label: "Overdue",
    hint: "The first visit is a reset clean: one-time rate × 1.4.",
  },
] as const;

export type Condition = (typeof CONDITIONS)[number]["id"];

export type QuoteInput = {
  band: BandId;
  bedrooms: number;
  fullBaths: number;
  halfBaths: number;
  frequency: Frequency;
  condition: Condition;
};

export type Money = {
  beforeHst: number;
  withHst: number;
};

export type Quote =
  | {
      custom: true;
      band: BandId;
      label: string;
    }
  | {
      custom: false;
      band: BandId;
      label: string;
      base: number;
      bedrooms: number;
      fullBaths: number;
      halfBaths: number;
      bedroomAdd: number;
      fullBathAdd: number;
      halfBathAdd: number;
      subtotal: number;
      frequency: Frequency;
      frequencyLabel: string;
      frequencyMultiplier: number;
      condition: Condition;
      conditionLabel: string;
      /** Lived-in multiplier applied to the plan, and to a non-reset first visit. */
      livedInMultiplier: number;
      /** Unrounded plan visit. Null for a one-time booking. */
      planRaw: number | null;
      plan: Money | null;
      /** onetime, or reset when the home is overdue. */
      firstKind: "onetime" | "reset";
      firstMultiplier: number;
      firstRaw: number;
      first: Money;
    };

/**
 * Round to the nearest dollar amount ending in 9 (149, 159, 169…).
 * A value exactly halfway between two such amounts rounds toward +∞.
 */
export function to9(amount: number): number {
  return Math.round((amount - 9) / 10) * 10 + 9;
}

export function withHst(beforeTax: number): number {
  return Math.round(beforeTax * (1 + HST_RATE) * 100) / 100;
}

function money(beforeTax: number): Money {
  const beforeHst = to9(beforeTax);
  return { beforeHst, withHst: withHst(beforeHst) };
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function quoteHome(input: QuoteInput): Quote {
  const found = SQFT_BANDS.find((item) => item.id === input.band);
  if (!found) {
    throw new Error(`Unknown sq ft band: ${input.band}`);
  }
  // Widen `base` so a future unpriced band still returns a custom quote.
  // Every band published today has a number.
  const band: { id: BandId; label: string; base: number | null } = found;
  if (band.base == null) {
    return { custom: true, band: band.id, label: band.label };
  }

  const frequency = FREQUENCIES.find((item) => item.id === input.frequency);
  const condition = CONDITIONS.find((item) => item.id === input.condition);
  if (!frequency || !condition) {
    throw new Error("Unknown frequency or condition");
  }

  const bedrooms = clamp(input.bedrooms, 0, 8);
  const fullBaths = clamp(input.fullBaths, 1, 8);
  const halfBaths = clamp(input.halfBaths, 0, 6);
  const bedroomAdd = Math.max(0, bedrooms - 1) * 20;
  const fullBathAdd = Math.max(0, fullBaths - 1) * 30;
  const halfBathAdd = halfBaths * 15;
  const subtotal = band.base + bedroomAdd + fullBathAdd + halfBathAdd;
  const livedInMultiplier = condition.id === "livedin" ? 1.1 : 1;
  const planRaw =
    frequency.id === "onetime" ? null : subtotal * frequency.multiplier * livedInMultiplier;

  let firstKind: "onetime" | "reset" = "onetime";
  let firstMultiplier = 1.22 * livedInMultiplier;
  if (condition.id === "overdue") {
    firstKind = "reset";
    firstMultiplier = 1.22 * 1.4;
  }
  const firstRaw = subtotal * firstMultiplier;

  return {
    custom: false,
    band: band.id,
    label: band.label,
    base: band.base,
    bedrooms,
    fullBaths,
    halfBaths,
    bedroomAdd,
    fullBathAdd,
    halfBathAdd,
    subtotal,
    frequency: frequency.id,
    frequencyLabel: frequency.label,
    frequencyMultiplier: frequency.multiplier,
    condition: condition.id,
    conditionLabel: condition.label,
    livedInMultiplier,
    planRaw,
    plan: planRaw == null ? null : money(planRaw),
    firstKind,
    firstMultiplier,
    firstRaw,
    first: money(firstRaw),
  };
}

/** Lowest advertised visit: weekly plan, band A, maintained, one bed, one bath. */
export function fromPrice(): Money {
  const quote = quoteHome({
    band: "A",
    bedrooms: 1,
    fullBaths: 1,
    halfBaths: 0,
    frequency: "weekly",
    condition: "standard",
  });
  if (quote.custom || !quote.plan) {
    throw new Error("Expected a weekly plan price");
  }
  return quote.plan;
}
