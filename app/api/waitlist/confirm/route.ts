import { confirmWaitlistRequest, jsonResult, readJsonRequest } from "@/lib/waitlist-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Mark a reserved address as kept after Web3Forms accepts it. */
export async function POST(request: Request) {
  const read = await readJsonRequest(request);
  if (!read.ok) return jsonResult(read.result);
  return jsonResult(await confirmWaitlistRequest(read.value));
}
