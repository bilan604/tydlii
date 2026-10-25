import { parseWaitlist } from "@/lib/waitlist";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  const webhook = process.env.WAITLIST_WEBHOOK_URL?.trim();
  if (!webhook) {
    console.log("[tydlii waitlist] stub accepted", JSON.stringify(payload));
    return json({ ok: true });
  }

  let url: URL;
  try {
    url = new URL(webhook);
  } catch {
    console.error("[tydlii waitlist] WAITLIST_WEBHOOK_URL is not a valid URL");
    return json(
      { ok: false, error: "We could not save that just now. Try again in a moment." },
      500,
    );
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    console.error("[tydlii waitlist] WAITLIST_WEBHOOK_URL must be http or https");
    return json(
      { ok: false, error: "We could not save that just now. Try again in a moment." },
      500,
    );
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      console.error("[tydlii waitlist] webhook responded", response.status);
      return json(
        { ok: false, error: "We could not save that just now. Try again in a moment." },
        502,
      );
    }
  } catch {
    console.error("[tydlii waitlist] webhook request failed");
    return json(
      { ok: false, error: "We could not save that just now. Try again in a moment." },
      502,
    );
  }

  return json({ ok: true });
}
