import { recordWaitlist, SAVE_ERROR } from "./waitlist-notify";
import { parseWaitlist } from "./waitlist";
import { waitlistStore, type WaitlistStore } from "./waitlist-store";

export type WaitlistHttpResult = {
  status: number;
  body: Record<string, unknown>;
};

const READ_ERROR = "That signup could not be read.";

export async function readJsonRequest(
  request: Request,
): Promise<{ ok: true; value: unknown } | { ok: false; result: WaitlistHttpResult }> {
  let text: string;
  try {
    text = await request.text();
  } catch {
    return { ok: false, result: { status: 400, body: { ok: false, error: READ_ERROR } } };
  }
  if (text.length > 20_000) {
    return { ok: false, result: { status: 413, body: { ok: false, error: "That signup is too large." } } };
  }
  try {
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch {
    return { ok: false, result: { status: 400, body: { ok: false, error: READ_ERROR } } };
  }
}

export function jsonResult(result: WaitlistHttpResult): Response {
  return Response.json(result.body, { status: result.status });
}

function readClaimId(input: unknown): { email: string; claimId: string } | null {
  if (!input || typeof input !== "object") return null;
  const body = input as Record<string, unknown>;
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const claimId = typeof body.claimId === "string" ? body.claimId.trim() : "";
  if (!email || !claimId) return null;
  return { email, claimId };
}

/**
 * Reserve the address before the browser emails Web3Forms.
 * Spam is accepted and not stored, so a bot learns nothing and a human who
 * tripped the trap is not marked as joined.
 */
export async function claimWaitlistRequest(
  input: unknown,
  store: WaitlistStore = waitlistStore,
): Promise<WaitlistHttpResult> {
  const parsed = parseWaitlist(input);
  if (!parsed.ok) return { status: 400, body: { ok: false, error: parsed.error } };
  if (parsed.spam) return { status: 200, body: { ok: true, spam: true } };

  const claim = await store.claim(parsed.value);
  if (claim.status === "duplicate") return { status: 200, body: { ok: true, duplicate: true } };
  if (claim.status === "unavailable") return { status: 503, body: { ok: false, error: SAVE_ERROR } };
  return { status: 200, body: { ok: true, claimed: true, claimId: claim.claimId } };
}

/** Keep a reserve after Web3Forms has accepted the signup, then log it. */
export async function confirmWaitlistRequest(
  input: unknown,
  store: WaitlistStore = waitlistStore,
  webhookUrl: string | undefined = process.env.WAITLIST_WEBHOOK_URL,
): Promise<WaitlistHttpResult> {
  const claim = readClaimId(input);
  if (!claim) return { status: 400, body: { ok: false, error: READ_ERROR } };

  const confirmed = await store.confirm(claim.email, claim.claimId);
  if (confirmed.status === "unavailable") return { status: 503, body: { ok: false, error: SAVE_ERROR } };
  if (confirmed.status === "missing") return { status: 409, body: { ok: false, error: SAVE_ERROR } };
  if (confirmed.status === "confirmed") {
    await recordWaitlist(
      { ...confirmed.signup, createdAt: confirmed.createdAt, source: "tydlii.com" },
      webhookUrl,
    );
  }
  return { status: 200, body: { ok: true } };
}

/** Drop a reserve when Web3Forms rejected the signup so the person can retry. */
export async function releaseWaitlistRequest(
  input: unknown,
  store: WaitlistStore = waitlistStore,
): Promise<WaitlistHttpResult> {
  const claim = readClaimId(input);
  if (!claim) return { status: 400, body: { ok: false, error: READ_ERROR } };
  const released = await store.release(claim.email, claim.claimId);
  if (released === "unavailable") return { status: 503, body: { ok: false, error: SAVE_ERROR } };
  return { status: 200, body: { ok: true } };
}
