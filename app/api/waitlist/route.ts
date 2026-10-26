import { deliverWaitlist } from "@/lib/waitlist-notify";
import { parseWaitlist } from "@/lib/waitlist";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Env (set on Render; never commit secrets):
 * - WAITLIST_WEB3FORMS_ACCESS_KEY — Web3Forms key for teamtydlii@gmail.com.
 *   When set, a non-spam signup returns ok only after Web3Forms accepts it.
 *   When unset in production, the signup is logged and the route returns 500.
 *   When unset outside production, the signup is logged and the route returns 200.
 * - WAITLIST_WEBHOOK_URL — optional http(s) JSON forward after that accept.
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

  const delivered = await deliverWaitlist(payload);
  if (!delivered.ok) {
    return json({ ok: false, error: delivered.error }, delivered.status);
  }
  return json({ ok: true });
}
