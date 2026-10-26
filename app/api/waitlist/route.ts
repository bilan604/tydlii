import { recordWaitlist } from "@/lib/waitlist-notify";
import { parseWaitlist } from "@/lib/waitlist";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Env (set on Render; never commit the key):
 * - NEXT_PUBLIC_WAITLIST_WEB3FORMS_ACCESS_KEY — public Web3Forms key. The browser
 *   posts the signup. Next.js inlines it into the client bundle at build time.
 * - WAITLIST_WEB3FORMS_ACCESS_KEY — optional fallback the homepage can pass to the
 *   form when the public var is unset. This route does not call Web3Forms.
 * - WAITLIST_WEBHOOK_URL — optional http(s) JSON forward after validation.
 *   Failures are logged only. Do not point this at a Google Apps Script web app.
 */

function json(body: { ok: boolean; error?: string }, status = 200) {
  return Response.json(body, { status });
}

export async function POST(request: Request) {
  let text: string;
  try {
    text = await request.text();
  } catch {
    return json({ ok: false, error: "That signup could not be read." }, 400);
  }

  if (text.length > 20_000) {
    return json({ ok: false, error: "That signup is too large." }, 413);
  }

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return json({ ok: false, error: "That signup could not be read." }, 400);
  }

  const parsed = parseWaitlist(body);
  if (!parsed.ok) {
    return json({ ok: false, error: parsed.error }, 400);
  }
  if (parsed.spam) {
    return json({ ok: true });
  }

  const payload = {
    ...parsed.value,
    createdAt: new Date().toISOString(),
    source: "tydlii.com",
  };

  await recordWaitlist(payload, process.env.WAITLIST_WEBHOOK_URL);
  return json({ ok: true });
}
