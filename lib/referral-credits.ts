import type { WaitlistStore } from "./waitlist-store";
import { waitlistStore } from "./waitlist-store";

/**
 * Booking integration stub.
 *
 * This app has no bookings and no payments. When that exists, call
 * `earnReferralCreditsForFirstPaidClean` from the server path that records
 * the referred customer's first paid clean (payment captured and the clean
 * completed). Do not call it for a quote, a cancelled visit, or an unpaid booking.
 *
 * There is no HTTP route, so a browser cannot flip a credit.
 *
 * What it does:
 * - Finds every credit whose `referredEmail` is this customer.
 * - Moves `pending` credits to `earned` and stores `bookingId`.
 * - Leaves `earned` and `applied` credits alone, so a repeat call is safe.
 * - Does not pay cash and does not mark the credit `applied`.
 *
 * Later, when an invoice actually uses the $25, call `applyReferralCredit`.
 * That refuses a credit that is still `pending` (no redeem-before-convert).
 */
export async function earnReferralCreditsForFirstPaidClean(
  email: string,
  bookingId: string,
  store: WaitlistStore = waitlistStore,
) {
  return store.earnFirstPaidClean(email, bookingId);
}

export async function applyReferralCredit(creditId: string, bookingId: string, store: WaitlistStore = waitlistStore) {
  return store.applyReferralCredit(creditId, bookingId);
}
