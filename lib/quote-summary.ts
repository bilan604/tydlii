import { cad } from "./format";
import type { Quote } from "./pricing";

export const QUOTE_STORAGE_KEY = "tydlii.quote";
export const QUOTE_EVENT = "tydlii-quote";

function addOnClause(quote: Quote): string {
  const extra = (quote as { addOns?: unknown }).addOns;
  if (quote.custom || !Array.isArray(extra) || extra.length === 0) return "";
  const parts: string[] = [];
  let sum = 0;
  for (const item of extra) {
    if (!item || typeof item !== "object") continue;
    const label = "label" in item ? item.label : undefined;
    const amount = "amount" in item ? item.amount : undefined;
    if (typeof label !== "string" || typeof amount !== "number" || !Number.isFinite(amount)) continue;
    parts.push(`${label} ${cad(amount)}`);
    sum += amount;
  }
  if (parts.length === 0) return "";
  const totals = quote.plan
    ? `per visit ${cad(quote.plan.beforeHst + sum)} before HST, first visit ${cad(quote.first.beforeHst + sum)}`
    : `total ${cad(quote.first.beforeHst + sum)} before HST`;
  return `. Add-ons on the locked price: ${parts.join(", ")}; ${totals}`;
}

export function summarizeQuote(quote: Quote & { addOns?: unknown }): string {
  if (quote.custom) return `${quote.label} — custom quote`;
  const base = !quote.plan
    ? `${quote.label}, ${quote.firstKind === "reset" ? "reset clean" : quote.frequencyLabel}, ${quote.conditionLabel}: ${cad(quote.first.beforeHst)} before HST`
    : `${quote.label}, ${quote.frequencyLabel}, ${quote.conditionLabel}: ${cad(quote.plan.beforeHst)} per visit before HST, first visit ${cad(quote.first.beforeHst)}`;
  return base + addOnClause(quote);
}

export function isStoredQuote(value: unknown): value is Quote {
  if (!value || typeof value !== "object") return false;
  const quote = value as { custom?: unknown; label?: unknown; first?: unknown };
  if (quote.custom === true && typeof quote.label === "string") return true;
  return quote.custom === false && typeof quote.label === "string" && !!quote.first;
}
