import { isStoredQuote, summarizeQuote } from "./quote-summary";
import { referralCodeFromInput } from "./referral";
import { parseWaitlist, type WaitlistSignup } from "./waitlist";

/** Web3Forms JSON endpoint. Do not send a `redirect` field; that turns the response into a 303. */
export const WEB3FORMS_ENDPOINT = "https://api.web3forms.com/submit";

export const SAVE_ERROR = "We could not save that just now. Try again in a moment.";

const TIMEOUT_MS = 8_000;

export type WaitlistRecord = WaitlistSignup & {
  createdAt: string;
  source: string;
  /** This customer's own code, once the signup is kept. */
  referralCode?: string;
  /** Referrer email, once a code matches. */
  referredByEmail?: string;
  /** Code submitted with the signup, before or after it is resolved. */
  referredByCode?: string;
};

export type DeliverResult = { ok: true } | { ok: false; status: number; error: string };

/** `ok` is only returned after Web3Forms accepts the message. */
export type SendResult = { ok: true; emailed: true } | { ok: false; error: string };

/** What the form is allowed to show after a submit. */
export type WaitlistSubmitResult =
  | { status: "sent" }
  | { status: "duplicate" }
  | { status: "error"; error: string };

/**
 * Key the browser sends to Web3Forms. The public var is inlined into the client
 * bundle at build time. `serverFallback` is only for the server page, which can
 * still read WAITLIST_WEB3FORMS_ACCESS_KEY and pass the value down.
 */
export function configuredAccessKey(serverFallback?: string): string {
  return (
    process.env.NEXT_PUBLIC_WAITLIST_WEB3FORMS_ACCESS_KEY?.trim() ||
    serverFallback?.trim() ||
    ""
  );
}

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
  const lines = [
    `type: ${record.type}`,
    `name: ${oneLine(record.name)}`,
    `email: ${oneLine(record.email)}`,
    `phone: ${oneLine(record.phone)}`,
    `neighbourhoods: ${record.neighbourhoods.join(", ")}`,
    `notes: ${oneLine(record.notes)}`,
    `quote: ${oneLine(quoteSummary(record.quote))}`,
    `createdAt: ${record.createdAt}`,
    `source: ${oneLine(record.source)}`,
  ];
  if (record.referralCode) lines.push(`referralCode: ${oneLine(record.referralCode)}`);
  if (record.referredByEmail) lines.push(`referredBy: ${oneLine(record.referredByEmail)}`);
  if (record.referredByCode) lines.push(`referredByCode: ${oneLine(record.referredByCode)}`);
  return lines.join("\n");
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

export async function submitWeb3Forms(
  record: WaitlistRecord,
  accessKey: string,
  fetchImpl: typeof fetch = fetch,
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
 * Browser mailer. Validates and POSTs to Web3Forms.
 * A honeypot is not emailed and is not a success. Render's outbound IP is
 * blocked on the free plan, so this stays in the browser.
 */
export async function sendWaitlistEmail(
  input: unknown,
  accessKey: string | undefined,
  fetchImpl: typeof fetch = fetch,
): Promise<SendResult> {
  const parsed = parseWaitlist(input);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  if (parsed.spam) return { ok: false, error: SAVE_ERROR };

  const key = accessKey?.trim() ?? "";
  if (!key) {
    console.error("[tydlii waitlist] Web3Forms access key is not set");
    return { ok: false, error: SAVE_ERROR };
  }

  const referredByCode = parsed.value.type === "customer" ? referralCodeFromInput(input) : "";
  const record: WaitlistRecord = {
    ...parsed.value,
    createdAt: new Date().toISOString(),
    source: "tydlii.com",
    ...(referredByCode ? { referredByCode } : {}),
  };
  const sent = await submitWeb3Forms(record, key, fetchImpl);
  if (!sent.ok) return { ok: false, error: sent.error };
  return { ok: true, emailed: true };
}

type ClaimPayload = {
  ok?: unknown;
  claimed?: unknown;
  duplicate?: unknown;
  spam?: unknown;
  claimId?: unknown;
  error?: unknown;
};

async function postJson(
  fetchImpl: typeof fetch,
  url: string,
  body: unknown,
): Promise<{ ok: boolean; data: ClaimPayload }> {
  try {
    const response = await fetchImpl(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const data = (await response.json().catch(() => null)) as ClaimPayload | null;
    const payload = data && typeof data === "object" ? data : {};
    return { ok: response.ok && payload.ok === true, data: payload };
  } catch {
    return { ok: false, data: {} };
  }
}

/**
 * Browser submit. Reserve the address, email Web3Forms, then keep the reserve.
 * The success screen is `sent` only. A duplicate is a separate result and does
 * not call Web3Forms. Anything else is an error, including a filled honeypot.
 */
export async function deliverWaitlist(
  input: unknown,
  accessKey: string | undefined,
  fetchImpl: typeof fetch = fetch,
): Promise<WaitlistSubmitResult> {
  const parsed = parseWaitlist(input);
  if (!parsed.ok) return { status: "error", error: parsed.error };
  if (parsed.spam) return { status: "error", error: SAVE_ERROR };

  const key = accessKey?.trim() ?? "";
  if (!key) {
    console.error("[tydlii waitlist] Web3Forms access key is not set");
    return { status: "error", error: SAVE_ERROR };
  }

  const claim = await postJson(fetchImpl, "/api/waitlist", input);
  if (claim.data.duplicate === true && claim.ok) return { status: "duplicate" };
  const claimId = claim.data.claimId;
  if (!claim.ok || claim.data.spam === true || claim.data.claimed !== true || typeof claimId !== "string") {
    const error = typeof claim.data.error === "string" && claim.data.error ? claim.data.error : SAVE_ERROR;
    return { status: "error", error };
  }

  const referredByCode = parsed.value.type === "customer" ? referralCodeFromInput(input) : "";
  const record: WaitlistRecord = {
    ...parsed.value,
    createdAt: new Date().toISOString(),
    source: "tydlii.com",
    ...(referredByCode ? { referredByCode } : {}),
  };
  const sent = await submitWeb3Forms(record, key, fetchImpl);
  if (!sent.ok) {
    await postJson(fetchImpl, "/api/waitlist/release", { email: parsed.value.email, claimId });
    return { status: "error", error: sent.error };
  }

  const confirmBody = { email: parsed.value.email, claimId };
  const confirmed = await postJson(fetchImpl, "/api/waitlist/confirm", confirmBody);
  if (!confirmed.ok) await postJson(fetchImpl, "/api/waitlist/confirm", confirmBody);
  return { status: "sent" };
}

/**
 * Server log plus optional webhook. Does not call Web3Forms and does not fail the request.
 */
export async function recordWaitlist(
  record: WaitlistRecord,
  webhookUrl: string | undefined,
  fetchImpl: typeof fetch = fetch,
): Promise<{ ok: true }> {
  console.log("[tydlii waitlist] accepted", JSON.stringify(record));
  await forwardWebhook(record, webhookUrl, fetchImpl);
  return { ok: true };
}
