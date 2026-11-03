import { quoteHome, type QuoteInput } from "@/lib/pricing";

export function presentQuote(input: QuoteInput) {
  const quote = quoteHome(input);
  if (quote.custom) {
    return { custom: true as const, label: quote.label };
  }
  const headline = input.frequency === "onetime" || !quote.plan ? quote.first : quote.plan;
  return { custom: false as const, quote, headline };
}
