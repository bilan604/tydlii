import type { WaitlistStore } from "./waitlist-store";
import { waitlistStore } from "./waitlist-store";

/**
 * Booking integration stub.
 *
 * Two sides, two instruments:
 * - Friend: $25 off the first booking (`firstCleanDiscountCents` on the signup).
 *   The booking system subtracts that from the first invoice. It is not credited
 *   to the friend after the clean.
 * - Referrer: $25 account credit. Call `earnReferralCreditsForFirstPaidClean`
 *   from the server path that records the friend's first clean as paid (payment
 *   captured and the clean completed). That moves the referrer's `pending`
 *   credit to `earned`. Do not call it for a quote, a cancellation, or an unpaid booking.
 *
 * This app has no bookings and no payments. There is no HTTP route, so a
 * browser cannot flip a credit. Nothing here is cash.
 *
 * What earn does:
 * - Finds the referrer credit whose `referredEmail` is this customer.
 * - Moves that `pending` credit to `earned` and stores `bookingId`.
 * - Leaves `friend` rows, and `earned` or `applied` credits, alone. A repeat call earns nothing.
 *
 * Later, when an invoice uses the referrer's $25, call `applyReferralCredit`.
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
