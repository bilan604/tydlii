/** The only inbox for privacy, deletion, and support. Not the Resend From address. */
export const LEGAL_EMAIL = "teamtydlii@gmail.com";

/** Shown on /privacy. Terms uses TERMS_UPDATED once that page moves ahead. */
export const LEGAL_UPDATED = "4 November 2026";

/** Shown on /terms. Privacy keeps LEGAL_UPDATED. */
export const TERMS_UPDATED = "5 November 2026";

export const PRIVACY_PATH = "/privacy";
export const TERMS_PATH = "/terms";

/**
 * Same purpose the cleaner app states for when-in-use location.
 * Tracking is job-only. There is no background location permission.
 */
export const LOCATION_PURPOSE =
  "Tydlii uses your location only while a job is active (on the way, arrived, or cleaning) so the customer can follow the visit. Tracking stops when the job is marked Done. Location is not collected in the background.";
