import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Marks control-room requests so the marketing footer can stay out of the
 * private room, and sets response headers a public page should not need.
 * Authentication stays in the route handlers. This file does not grant access.
 */
export function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-tydlii-chrome", "control");
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("x-robots-tag", "noindex, nofollow, noarchive");
  response.headers.set("x-frame-options", "DENY");
  response.headers.set("referrer-policy", "no-referrer");
  response.headers.set("x-content-type-options", "nosniff");
  response.headers.set("permissions-policy", "geolocation=(), camera=(), microphone=(), payment=()");
  response.headers.set("cache-control", "private, no-cache, no-store, max-age=0, must-revalidate");
  return response;
}

export const config = {
  matcher: ["/control", "/control/:path*", "/api/control/:path*"],
};
