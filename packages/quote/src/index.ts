/**
 * Instant quote math from the Tydlii landing brief, extended through 20,000 sq ft.
 *
 * This package is the only quote table. The website (`lib/pricing.ts`) and both
 * Expo apps import it. Customer-facing labels match the live tydlii.com quote form.
 *
 * Bands A–C keep the published bases: 165, 189, 209.
 * From band D up, base = 139 + $0.10 × the band floor. That line is the brief for
 * D–G (239, 269, 299, 339) and the same formula prices every larger band.
 * +20 per bedroom after the first, +30 per full bath after the first, +15 per half bath
 * Frequency: weekly 0.91, bi-weekly 1.0, every 4 weeks 1.1, one-time 1.22
 * Lived-in ×1.1
 * Overdue first visit = one-time × 1.4 (a reset). Otherwise the first visit is the one-time rate.
 * Round the charged pre-tax amount to the nearest price ending in 9 (`to9`).
 * Show that amount before HST, and again with 13% HST.
 * Add-ons stack on that locked visit price. They are not multiplied by frequency,
 * lived-in, or the overdue reset, and they are not run through `to9` again.
 *
 * Sq ft cut points label those bases. They are the public bands. A null base would
 * be a custom quote; every published band has a price.
 *
 * The form offers beds 1–5, full baths 1–4, and half baths 0–2. `quoteHome` still
 * clamps a wider range so a studio, or a stored quote outside the form, cannot go
 * negative. Those wider clamps are not shown on tydlii.com or in the apps.
 */

export const HST_RATE = 0.13;

/** Day-one cleaner share of the pre-tax visit price. Growth copy uses the cap; it is not a second price. */
export const CLEANER_SHARE_PERCENT = 67;
export const CLEANER_SHARE_GROWTH_PERCENT = 72;

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
  { id: "biweekly", label: "Bi-weekly", multiplier: 1, hint: "Most homes" },
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
    label: "Lived-in (pets, kids, 4+ wks)",
    hint: "Everyday mess. Priced at 1.1×.",
  },
  {
    id: "overdue",
    label: "Overdue (needs a reset)",
    hint: "The first visit is a reset clean: one-time rate × 1.4.",
  },
] as const;

export type Condition = (typeof CONDITIONS)[number]["id"];

/** Choices on the live quote form. Both the site and the customer app render these. */
export const BEDROOM_OPTIONS = [1, 2, 3, 4, 5] as const;
export const FULL_BATH_OPTIONS = [1, 2, 3, 4] as const;
export const HALF_BATH_OPTIONS = [0, 1, 2] as const;

export const QUOTE_FIELDS = {
  bedrooms: "Bedrooms (den counts as one)",
  fullBaths: "Full bathrooms",
  halfBaths: "Half bathrooms",
  band: "Home size",
  frequency: "How often",
  condition: "Condition today",
} as const;

export const DEFAULT_QUOTE_INPUT: QuoteInput = {
  band: "C",
  bedrooms: 2,
  fullBaths: 1,
  halfBaths: 0,
  frequency: "biweekly",
  condition: "standard",
};

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

export type PricedQuote = Extract<Quote, { custom: false }>;

export type FirstVisitNote = {
  kind: "deeper" | "reset";
  beforeHst: number;
  withHst: number;
};

export type QuotePresentation =
  | {
      custom: true;
      label: string;
    }
  | {
      custom: false;
      quote: PricedQuote;
      /** Landing panel eyebrow, for example "Bi-weekly · per visit". */
      eyebrow: string;
      /** Plan price for a recurring clean. One-time and reset-only visits use the first visit. */
      headline: Money;
      /** Set on a recurring plan. Null for a one-time booking. */
      firstVisit: FirstVisitNote | null;
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

/**
 * Dollar share of a pre-tax visit. Uses integer percent rounding so 67% of $229
 * is $153.43, the figure on the landing cleaner pitch.
 */
export function cleanerShareAmount(beforeHst: number, percent = CLEANER_SHARE_PERCENT): number {
  return Math.round(beforeHst * percent) / 100;
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

/**
 * What tydlii.com shows in the quote panel for these inputs.
 * A recurring plan headlines the plan price. A one-time visit headlines the first visit.
 */
export function quotePresentation(input: QuoteInput): QuotePresentation {
  const quote = quoteHome(input);
  if (quote.custom) return { custom: true, label: quote.label };

  const recurring = input.frequency !== "onetime" && quote.plan != null;
  const headline = recurring && quote.plan ? quote.plan : quote.first;
  const eyebrow = recurring
    ? `${quote.frequencyLabel} · per visit`
    : quote.firstKind === "reset"
      ? "One-time reset clean"
      : "One-time clean";
  const firstVisit: FirstVisitNote | null = recurring
    ? {
        kind: quote.firstKind === "reset" ? "reset" : "deeper",
        beforeHst: quote.first.beforeHst,
        withHst: quote.first.withHst,
      }
    : null;

  return { custom: false, quote, eyebrow, headline, firstVisit };
}

/** Sentence under the plan price on the landing quote panel. */
export function firstVisitSentence(kind: FirstVisitNote["kind"], beforeHstLabel: string): string {
  const lead =
    kind === "reset" ? "First visit is a deep Reset clean: " : "First visit is a deeper clean: ";
  return `${lead}${beforeHstLabel} + HST. Your plan price starts from visit two.`;
}

/** Liberty Village preview the landing and the cleaner sample offer both show. */
export function landingPreviewShare(): { visitBeforeHst: number; share: number } {
  const quote = quoteHome(DEFAULT_QUOTE_INPUT);
  if (quote.custom || !quote.plan) {
    throw new Error("Default quote is missing a plan price");
  }
  return {
    visitBeforeHst: quote.plan.beforeHst,
    share: cleanerShareAmount(quote.plan.beforeHst),
  };
}

/**
 * Sellable extras. Prices are before HST.
 * Flat rows are on or off. Blinds are per window. Bed linens are per bed.
 * Laundry is one load. Interior windows show "from $39" and lock at $39
 * for interior glass and tracks this visit.
 * `unitPrice` is what a selected row adds. Nothing here is re-rounded.
 */
export const ADD_ONS = [
  {
    id: "fridge",
    label: "Inside fridge",
    menuPrice: "$29",
    inclusion: "Empty perishables aside; shelves and drawers wiped.",
    unitPrice: 29,
    unit: "flat",
    max: 1,
  },
  {
    id: "oven",
    label: "Inside oven",
    menuPrice: "$29",
    inclusion: "Racks and cavity. Not a self-clean cycle.",
    unitPrice: 29,
    unit: "flat",
    max: 1,
  },
  {
    id: "cabinets",
    label: "Inside cabinets",
    menuPrice: "$39",
    inclusion: "Kitchen and bath cabinets this visit. Not whole-home closets.",
    unitPrice: 39,
    unit: "flat",
    max: 1,
  },
  {
    id: "windows",
    label: "Interior windows & tracks",
    menuPrice: "from $39",
    inclusion: "Interior glass and tracks this visit.",
    unitPrice: 39,
    unit: "flat",
    max: 1,
  },
  {
    id: "blinds",
    label: "Blinds",
    menuPrice: "$8/window",
    inclusion: "Per window, this visit.",
    unitPrice: 8,
    unit: "window",
    max: 30,
  },
  {
    id: "pets",
    label: "Pets in home",
    menuPrice: "$29",
    inclusion: "Pet-home surcharge for extra hair and dander. Not a specialty odor treatment.",
    unitPrice: 29,
    unit: "flat",
    max: 1,
  },
  {
    id: "laundry",
    label: "Laundry fold (1 load)",
    menuPrice: "$25",
    inclusion: "One load, folded.",
    unitPrice: 25,
    unit: "load",
    max: 1,
  },
  {
    id: "dishes",
    label: "Dishes",
    menuPrice: "$20",
    inclusion: "Washed this visit.",
    unitPrice: 20,
    unit: "flat",
    max: 1,
  },
  {
    id: "linens",
    label: "Change bed linens",
    menuPrice: "$15/bed",
    inclusion: "Per bed, this visit.",
    unitPrice: 15,
    unit: "bed",
    max: 8,
  },
] as const;

export type AddOn = (typeof ADD_ONS)[number];
export type AddOnId = AddOn["id"];
export type AddOnCounts = Record<AddOnId, number>;

export type AddOnLine = {
  id: AddOnId;
  label: string;
  inclusion: string;
  quantity: number;
  unitPrice: number;
  /** Before HST. Menu price times quantity. */
  amount: number;
};

export type StackedPrice = {
  /** Visit price after `to9`, before add-ons. */
  baseBeforeHst: number;
  lines: AddOnLine[];
  addOnsBeforeHst: number;
  /** Locked base plus add-on lines. Not passed through `to9`. */
  beforeHst: number;
  withHst: number;
};

export function emptyAddOns(): AddOnCounts {
  return {
    fridge: 0,
    oven: 0,
    cabinets: 0,
    windows: 0,
    blinds: 0,
    pets: 0,
    laundry: 0,
    dishes: 0,
    linens: 0,
  };
}

export function clampAddOnCount(id: AddOnId, quantity: number): number {
  const addOn = ADD_ONS.find((item) => item.id === id);
  if (!addOn || !Number.isFinite(quantity)) return 0;
  return Math.min(addOn.max, Math.max(0, Math.round(quantity)));
}

export function normalizeAddOns(counts?: Partial<AddOnCounts> | null): AddOnCounts {
  const next = emptyAddOns();
  if (!counts) return next;
  for (const addOn of ADD_ONS) {
    next[addOn.id] = clampAddOnCount(addOn.id, counts[addOn.id] ?? 0);
  }
  return next;
}

export function addOnLines(counts?: Partial<AddOnCounts> | null): AddOnLine[] {
  const normalized = normalizeAddOns(counts);
  const lines: AddOnLine[] = [];
  for (const addOn of ADD_ONS) {
    const quantity = normalized[addOn.id];
    if (quantity <= 0) continue;
    lines.push({
      id: addOn.id,
      label: addOn.label,
      inclusion: addOn.inclusion,
      quantity,
      unitPrice: addOn.unitPrice,
      amount: addOn.unitPrice * quantity,
    });
  }
  return lines;
}

/** Receipt label. Counted rows name the quantity; flat rows use the menu name. */
export function addOnLineLabel(line: AddOnLine): string {
  const addOn = ADD_ONS.find((item) => item.id === line.id);
  if (!addOn || addOn.unit === "flat" || addOn.unit === "load") return line.label;
  if (addOn.unit === "window") {
    return `${line.label} · ${line.quantity} ${line.quantity === 1 ? "window" : "windows"}`;
  }
  return `${line.label} · ${line.quantity} ${line.quantity === 1 ? "bed" : "beds"}`;
}

/** Add menu prices on top of a visit price that is already locked. */
export function stackOnLockedBase(
  baseBeforeHst: number,
  counts?: Partial<AddOnCounts> | null,
): StackedPrice {
  const lines = addOnLines(counts);
  const addOnsBeforeHst = lines.reduce((sum, line) => sum + line.amount, 0);
  const beforeHst = baseBeforeHst + addOnsBeforeHst;
  return {
    baseBeforeHst,
    lines,
    addOnsBeforeHst,
    beforeHst,
    withHst: withHst(beforeHst),
  };
}
