import { handleControlRequest } from "@/lib/control-room/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handle(request: Request, context: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await context.params;
  if (path.length === 0) {
    return Response.json({ error: "Not found." }, { status: 404, headers: { "x-robots-tag": "noindex" } });
  }
  return handleControlRequest(request, path);
}

export const GET = handle;
export const POST = handle;
export const DELETE = handle;
