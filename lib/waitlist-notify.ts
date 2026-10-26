import { isStoredQuote, summarizeQuote } from "./quote-summary";
import type { WaitlistSignup } from "./waitlist";

/** Web3Forms JSON endpoint. Do not send a `redirect` field; that turns the response into a 303. */
export const WEB3FORMS_ENDPOINT = "https://api.web3forms.com/submit";

export const SAVE_ERROR = "We could not save that just now. Try again in a moment.";

const TIMEOUT_MS = 8_000;

export type WaitlistRecord = WaitlistSignup & {
  createdAt: string;
  source: string;
};

export type DeliverResult = { ok: true } | { ok: false; status: number; error: string };

export type WaitlistEnv = {
  WAITLIST_WEB3FORMS_ACCESS_KEY?: string;
  WAITLIST_WEBHOOK_URL?: string;
  NODE_ENV?: string;
};

/**
 * One-line quote for the notification email.
 * A calculator quote uses the public summary. Anything else is JSON, so a shape change is still visible.
 */
export function quoteSummary(quote: unknown): string {
  if (quote == null) return "";
  if (isStoredQuote(quote)) return summarizeQuote(quote);
  if (typeof quote === "string") return quote;
  try {
    return JSON.stringify(quote);
  } catch {
    return "";
  }
}

function oneLine(value: string): string {
  return value.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim();
}

export function waitlistSubject(record: WaitlistRecord): string {
  return `[Tydlii waitlist] ${record.type} — ${oneLine(record.email)}`;
}

/** Plain-text body. One field per line so the inbox is scannable. */
export function waitlistMessage(record: WaitlistRecord): string {
  return [
    `type: ${record.type}`,
    `name: ${oneLine(record.name)}`,
    `email: ${oneLine(record.email)}`,
    `phone: ${oneLine(record.phone)}`,
    `neighbourhoods: ${record.neighbourhoods.join(", ")}`,
    `notes: ${oneLine(record.notes)}`,
    `quote: ${oneLine(quoteSummary(record.quote))}`,
    `createdAt: ${record.createdAt}`,
    `source: ${oneLine(record.source)}`,
  ].join("\n");
}

export function web3formsBody(record: WaitlistRecord, accessKey: string): Record<string, string> {
  return {
    access_key: accessKey,
    subject: waitlistSubject(record),
    from_name: oneLine(record.name) || "Tydlii",
    replyto: oneLine(record.email),
    message: waitlistMessage(record),
  };
}

type Web3FormsResult = { success: boolean; message: string };

async function readWeb3FormsResult(response: Response): Promise<Web3FormsResult> {
  const text = await response.text();
  if (!text) return { success: false, message: "" };
  try {
    const data = JSON.parse(text) as {
      success?: unknown;
      message?: unknown;
      body?: { message?: unknown };
    };
    const nested =
      data.body && typeof data.body === "object" && typeof data.body.message === "string"
        ? data.body.message
        : "";
    const message = typeof data.message === "string" ? data.message : nested;
    return { success: data.success === true, message: message.slice(0, 300) };
  } catch {
    return { success: false, message: "non-json response" };
  }
}

async function sendWeb3Forms(
  record: WaitlistRecord,
  accessKey: string,
  fetchImpl: typeof fetch,
): Promise<DeliverResult> {
  try {
    const response = await fetchImpl(WEB3FORMS_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(web3formsBody(record, accessKey)),
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const result = await readWeb3FormsResult(response);
    if (!response.ok || !result.success) {
      console.error("[tydlii waitlist] web3forms responded", response.status, result.message);
      return { ok: false, status: 502, error: SAVE_ERROR };
    }
    return { ok: true };
  } catch {
    console.error("[tydlii waitlist] web3forms request failed");
    return { ok: false, status: 502, error: SAVE_ERROR };
  }
}

/**
 * Optional extra copy of the signup. Never fails the request.
 * `redirect: "manual"` so a 302 (Apps Script /exec does this) is not followed into a 405.
 */
async function forwardWebhook(
  record: WaitlistRecord,
  webhook: string | undefined,
  fetchImpl: typeof fetch,
): Promise<void> {
  const raw = webhook?.trim();
  if (!raw) return;

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    console.error("[tydlii waitlist] WAITLIST_WEBHOOK_URL is not a valid URL");
    return;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    console.error("[tydlii waitlist] WAITLIST_WEBHOOK_URL must be http or https");
    return;
  }

  try {
    const response = await fetchImpl(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(record),
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) {
      console.error("[tydlii waitlist] webhook responded", response.status);
    }
  } catch {
    console.error("[tydlii waitlist] webhook request failed");
  }
}

/**
 * Email the signup via Web3Forms, then best-effort forward to WAITLIST_WEBHOOK_URL.
 * With no access key outside production, the signup is logged and accepted so local dev still works.
 * In production a missing key is logged and the request fails, so the form does not claim success.
 */
export async function deliverWaitlist(
  record: WaitlistRecord,
  env: WaitlistEnv = {
    WAITLIST_WEB3FORMS_ACCESS_KEY: process.env.WAITLIST_WEB3FORMS_ACCESS_KEY,
    WAITLIST_WEBHOOK_URL: process.env.WAITLIST_WEBHOOK_URL,
    NODE_ENV: process.env.NODE_ENV,
  },
  fetchImpl: typeof fetch = fetch,
): Promise<DeliverResult> {
  const accessKey = env.WAITLIST_WEB3FORMS_ACCESS_KEY?.trim() ?? "";
  if (!accessKey) {
    console.error(
      "[tydlii waitlist] WAITLIST_WEB3FORMS_ACCESS_KEY is not set; signup logged only",
    );
    console.log("[tydlii waitlist] stub accepted", JSON.stringify(record));
    if (env.NODE_ENV === "production") {
      return { ok: false, status: 500, error: SAVE_ERROR };
    }
    await forwardWebhook(record, env.WAITLIST_WEBHOOK_URL, fetchImpl);
    return { ok: true };
  }

  const sent = await sendWeb3Forms(record, accessKey, fetchImpl);
  if (!sent.ok) return sent;
  await forwardWebhook(record, env.WAITLIST_WEBHOOK_URL, fetchImpl);
  return { ok: true };
}
