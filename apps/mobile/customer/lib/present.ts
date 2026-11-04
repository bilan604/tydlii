import {
  addOnLineLabel,
  quotePresentation,
  stackOnLockedBase,
  type AddOnCounts,
  type QuoteInput,
  type StackedPrice,
} from "@tydlii/quote";

export type QuoteDraft = QuoteInput & { addOns?: Partial<AddOnCounts> | null };

/** Customer-app view of a quote. Same headline rule as the tydlii.com panel, with add-ons stacked on the locked price. */
export function presentQuote(input: QuoteDraft) {
  const presented = quotePresentation(input);
  if (presented.custom) return presented;
  const first = stackOnLockedBase(presented.quote.first.beforeHst, input.addOns);
  const plan = presented.quote.plan ? stackOnLockedBase(presented.quote.plan.beforeHst, input.addOns) : null;
  const headlineSource = input.frequency === "onetime" || !plan ? first : plan;
  return {
    ...presented,
    headline: { beforeHst: headlineSource.beforeHst, withHst: headlineSource.withHst },
    first,
    plan,
  };
}

export function receiptRows(stacked: StackedPrice): { label: string; amount: number }[] {
  return [
    { label: "Locked clean", amount: stacked.baseBeforeHst },
    ...stacked.lines.map((line) => ({ label: addOnLineLabel(line), amount: line.amount })),
  ];
}
