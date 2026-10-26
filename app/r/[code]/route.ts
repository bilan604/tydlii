import { NextResponse } from "next/server";
import { referralLandingUrl } from "@/lib/referral";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** `tydlii.com/r/CODE` opens the homepage with `?ref=CODE`. */
export async function GET(request: Request, context: { params: Promise<{ code: string }> }) {
  const { code } = await context.params;
  return NextResponse.redirect(referralLandingUrl(code, request.url), 302);
}
