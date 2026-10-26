import { SITE } from "./site";

/**
 * Referral codes and credit rules for customer waitlist invites.
 *
 * A friend who joins with a code is stored with `referredBy`. Both people get
 * a $25 account credit that stays `pending` until that friend completes a
 * first paid clean, then `earned`. Applying the credit to an invoice is a
 * later step and refuses anything still pending. Nothing here is cash.
 */

export const REFERRAL_CREDIT_CENTS = 2500;
export const REFERRAL_CREDIT_CURRENCY = "CAD" as const;
export const REFERRAL_CODE_LENGTH = 8;

/** No 0/o, 1/l/i. Codes are case-insensitive and stored lowercase. */
export const REFERRAL_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

export const REFERRAL_CREDIT_PROMISE = "Both get $25 credit after their first paid clean.";

/** sessionStorage key for a `?ref=` code captured on the homepage. */
export const REFERRAL_STORAGE_KEY = "tydlii.ref";

const CODE_PATTERN = new RegExp(`^[${REFERRAL_ALPHABET}]{6,16}$`);

export type ReferralCreditStatus = "pending" | "earned" | "applied";
export type ReferralCreditRole = "referrer" | "friend";

export type ReferralCredit = {
  id: string;
  /** Who receives the $25 account credit. */
  beneficiaryEmail: string;
  /** The friend whose first paid clean earns both credits. */
  referredEmail: string;
  /** The customer who shared the code. */
  referrerEmail: string;
  code: string;
  role: ReferralCreditRole;
  amountCents: number;
  currency: typeof REFERRAL_CREDIT_CURRENCY;
  status: ReferralCreditStatus;
  createdAt: string;
  earnedAt: string | null;
  appliedAt: string | null;
  /** Booking that recorded the friend's first paid clean. */
  earnedBookingId: string | null;
  /** Later invoice that used the credit. Not set at earn time. */
  appliedBookingId: string | null;
};

export type CustomerReferral = {
  code: string;
  /** Friend landing URL. `https://tydlii.com/?ref=CODE`. */
  shareUrl: string;
  /** Page where the referrer can see and copy that URL. */
  manageUrl: string;
  referredByCode: string | null;
  referredByEmail: string | null;
  creditsCreated: number;
};

export function normalizeReferralCode(value: unknown): string {
  if (typeof value !== "string") return "";
  const code = value.trim().toLowerCase();
  return CODE_PATTERN.test(code) ? code : "";
}

/** `ref` or `referralCode` on a waitlist body. Empty when absent or invalid. */
export function referralCodeFromInput(input: unknown): string {
  if (!input || typeof input !== "object") return "";
  const body = input as Record<string, unknown>;
  return normalizeReferralCode(body.ref ?? body.referralCode);
}

export function referralShareUrl(code: string, origin: string = SITE.url): string {
  const url = new URL(origin);
  url.pathname = "/";
  url.search = `?ref=${encodeURIComponent(code)}`;
  url.hash = "";
  return url.toString();
}

export function referralManageUrl(code: string, origin: string = SITE.url): string {
  const url = new URL(origin);
  url.pathname = "/refer";
  url.search = `?code=${encodeURIComponent(code)}`;
  url.hash = "";
  return url.toString();
}

/** Where `/r/CODE` sends a browser. Invalid codes land on the homepage with no ref. */
export function referralLandingUrl(code: string, origin: string): string {
  const url = new URL(origin);
  url.pathname = "/";
  url.hash = "";
  const normalized = normalizeReferralCode(code);
  url.search = normalized ? `?ref=${normalized}` : "";
  return url.toString();
}

export function parseReferralCredit(value: unknown): ReferralCredit | null {
  if (!value || typeof value !== "object") return null;
  const credit = value as Partial<ReferralCredit>;
  if (typeof credit.id !== "string" || credit.id.trim() === "") return null;
  if (typeof credit.beneficiaryEmail !== "string" || typeof credit.referredEmail !== "string") return null;
  if (typeof credit.referrerEmail !== "string" || typeof credit.code !== "string") return null;
  if (credit.role !== "referrer" && credit.role !== "friend") return null;
  if (typeof credit.amountCents !== "number" || !Number.isInteger(credit.amountCents) || credit.amountCents <= 0) {
    return null;
  }
  if (credit.currency !== REFERRAL_CREDIT_CURRENCY) return null;
  if (credit.status !== "pending" && credit.status !== "earned" && credit.status !== "applied") return null;
  if (typeof credit.createdAt !== "string") return null;
  if (credit.earnedAt !== null && typeof credit.earnedAt !== "string") return null;
  if (credit.appliedAt !== null && typeof credit.appliedAt !== "string") return null;
  if (credit.earnedBookingId !== null && typeof credit.earnedBookingId !== "string") return null;
  if (credit.appliedBookingId !== null && typeof credit.appliedBookingId !== "string") return null;
  return {
    id: credit.id,
    beneficiaryEmail: credit.beneficiaryEmail,
    referredEmail: credit.referredEmail,
    referrerEmail: credit.referrerEmail,
    code: credit.code,
    role: credit.role,
    amountCents: credit.amountCents,
    currency: REFERRAL_CREDIT_CURRENCY,
    status: credit.status,
    createdAt: credit.createdAt,
    earnedAt: credit.earnedAt ?? null,
    appliedAt: credit.appliedAt ?? null,
    earnedBookingId: credit.earnedBookingId ?? null,
    appliedBookingId: credit.appliedBookingId ?? null,
  };
}

/** `null` when the field is present but not a credit list. Missing means none yet. */
export function parseCreditList(value: unknown): ReferralCredit[] | null {
  if (value == null) return [];
  if (!Array.isArray(value)) return null;
  const credits: ReferralCredit[] = [];
  for (const item of value) {
    const credit = parseReferralCredit(item);
    if (!credit) return null;
    credits.push(credit);
  }
  return credits;
}

export type ReferralDecision =
  | { ok: true; referrerEmail: string; referredByCode: string }
  | { ok: false; reason: "none" | "unknown" | "self" | "already-credited" };

/**
 * Whether a friend signup may store `referredBy` and open a new credit pair.
 * `already-credited` means this referred email already has a credit, so a
 * second referrer does not get one. Self-referral is the same normalized email.
 */
export function decideReferral(input: {
  signupEmail: string;
  requestedCode: string;
  referrerEmail: string | null;
  alreadyCredited: boolean;
}): ReferralDecision {
  if (input.alreadyCredited) return { ok: false, reason: "already-credited" };
  if (!input.requestedCode) return { ok: false, reason: "none" };
  if (!input.referrerEmail) return { ok: false, reason: "unknown" };
  if (input.referrerEmail === input.signupEmail) return { ok: false, reason: "self" };
  return { ok: true, referrerEmail: input.referrerEmail, referredByCode: input.requestedCode };
}

export function earnPendingCredits(
  credits: readonly ReferralCredit[],
  referredEmail: string,
  bookingId: string,
  at: string,
): { credits: ReferralCredit[]; earned: number } {
  let earned = 0;
  const next = credits.map((credit) => {
    if (credit.referredEmail !== referredEmail || credit.status !== "pending") return credit;
    earned += 1;
    return {
      ...credit,
      status: "earned" as const,
      earnedAt: at,
      earnedBookingId: bookingId,
    };
  });
  return { credits: next, earned };
}

export type ApplyCreditResult = "applied" | "already" | "not-earned" | "missing";

export function applyEarnedCredit(
  credits: readonly ReferralCredit[],
  creditId: string,
  bookingId: string,
  at: string,
): { credits: ReferralCredit[]; result: ApplyCreditResult } {
  const index = credits.findIndex((credit) => credit.id === creditId);
  if (index < 0) return { credits: [...credits], result: "missing" };
  const credit = credits[index];
  if (credit.status === "applied") return { credits: [...credits], result: "already" };
  if (credit.status !== "earned") return { credits: [...credits], result: "not-earned" };
  const next = credits.map((item, itemIndex) =>
    itemIndex === index
      ? { ...item, status: "applied" as const, appliedAt: at, appliedBookingId: bookingId }
      : item,
  );
  return { credits: next, result: "applied" };
}
