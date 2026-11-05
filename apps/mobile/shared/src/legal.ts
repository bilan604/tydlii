export const PRIVACY_URL = "https://tydlii.com/privacy";
export const TERMS_URL = "https://tydlii.com/terms";

/** The only inbox for privacy, deletion, and support. Keep equal to LEGAL_EMAIL in lib/legal.ts. */
export const CONTACT_EMAIL = "teamtydlii@gmail.com";

/**
 * Prefilled deletion request. The inbox is CONTACT_EMAIL.
 * Role is only so the message says which app sent it. One email can be both.
 */
export function accountDeletionMailto(role: "customer" | "cleaner"): string {
  const subject = encodeURIComponent("Delete my Tydlii account");
  const body = encodeURIComponent(
    [
      "Please delete my Tydlii account and the personal information tied to this email.",
      `Sent from the ${role} app. This email may also be used as a customer and as a cleaner.`,
    ].join("\n\n"),
  );
  return `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
}

export const PRIVACY_SUMMARY =
  "Tydlii uses location only while a cleaner is on an active job, so the customer can follow the visit. Tracking stops when the job is Done. The app does not ask for background location. If location is off, the cleaner can still mark En route, Arrived, Cleaning, and Done, and the customer still sees those status chips.";

export const TERMS_SUMMARY =
  "Bookings in this preview use sample data. The price on a visit follows the tydlii.com quote. Checkout is a Stripe PaymentSheet stand-in in test mode: it does not charge a card, and a live Stripe key is refused. Earnings in this build are not paid out.";
