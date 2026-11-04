import { quotePresentation, type QuoteInput } from "@tydlii/quote";

/** Customer-app view of a quote. Same headline rule as the tydlii.com panel. */
export function presentQuote(input: QuoteInput) {
  return quotePresentation(input);
}
