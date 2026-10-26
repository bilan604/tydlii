import { claimWaitlistRequest, jsonResult, readJsonRequest } from "@/lib/waitlist-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Env (set on Render; never commit the key):
 * - NEXT_PUBLIC_WAITLIST_WEB3FORMS_ACCESS_KEY — public Web3Forms key. The browser
 *   posts the signup. Next.js inlines it into the client bundle at build time.
 * - WAITLIST_WEB3FORMS_ACCESS_KEY — optional fallback the homepage can pass to the
 *   form when the public var is unset. This route does not call Web3Forms.
 * - WAITLIST_WEBHOOK_URL — optional http(s) JSON forward after the browser confirms
 *   a signup that Web3Forms accepted. Failures are logged only.
 * - WAITLIST_STORE_PATH — JSON file of addresses already on the list. On Render this
 *   must sit on the persistent disk (`/var/data/waitlist-emails.json`).
 * - WAITLIST_SEED_EMAILS — optional comma-separated addresses already signed up.
 *   They count as duplicates and are not written into the file.
 * - RESEND_API_KEY — optional. Customer welcome email after confirm. Missing key
 *   skips the mail and does not fail the signup. See README.
 * - EMAIL_FROM — optional sender for that welcome, required together with the key.
 *
 * This route reserves an address. It does not send mail. The browser emails
 * Web3Forms only after a `claimed` response, then calls `/api/waitlist/confirm`.
 * Confirm stores a customer referral code and sends the welcome when Resend is set.
 */

export async function POST(request: Request) {
  const read = await readJsonRequest(request);
  if (!read.ok) return jsonResult(read.result);
  return jsonResult(await claimWaitlistRequest(read.value));
}
