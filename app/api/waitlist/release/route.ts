import { jsonResult, readJsonRequest, releaseWaitlistRequest } from "@/lib/waitlist-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Drop a reserve when Web3Forms rejects the signup. */
export async function POST(request: Request) {
  const read = await readJsonRequest(request);
  if (!read.ok) return jsonResult(read.result);
  return jsonResult(await releaseWaitlistRequest(read.value));
}
