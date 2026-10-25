import { cad } from "./format";
import type { Quote } from "./pricing";

export const QUOTE_STORAGE_KEY = "tydlii.quote";
export const QUOTE_EVENT = "tydlii-quote";

export function summarizeQuote(quote: Quote): string {
  if (quote.custom) return `${quote.label} — custom quote`;
  if (!quote.plan) {
    const kind = quote.firstKind === "reset" ? "reset clean" : quote.frequencyLabel;
    return `${quote.label}, ${kind}, ${quote.conditionLabel}: ${cad(quote.first.beforeHst)} before HST`;
  }
  return `${quote.label}, ${quote.frequencyLabel}, ${quote.conditionLabel}: ${cad(quote.plan.beforeHst)} per visit before HST, first visit ${cad(quote.first.beforeHst)}`;
}

export function isStoredQuote(value: unknown): value is Quote {
  if (!value || typeof value !== "object") return false;
  const quote = value as { custom?: unknown; label?: unknown; first?: unknown };
  if (quote.custom === true && typeof quote.label === "string") return true;
  return quote.custom === false && typeof quote.label === "string" && !!quote.first;
}
