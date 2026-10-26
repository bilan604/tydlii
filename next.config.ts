import type { NextConfig } from "next";

/**
 * Documents must not sit in a browser or CDN cache. A sticky homepage kept
 * phones on the pre-Web3Forms bundle, which only POSTs /api/waitlist.
 * Hashed /_next/static files stay immutable; their URLs change every build.
 */
const documentNoStore = [
  {
    key: "Cache-Control",
    value: "private, no-cache, no-store, max-age=0, must-revalidate",
  },
  { key: "CDN-Cache-Control", value: "no-store" },
  { key: "Cloudflare-CDN-Cache-Control", value: "no-store" },
  { key: "Pragma", value: "no-cache" },
  { key: "Expires", value: "0" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        // "/" itself, plus extension-less routes such as /api/waitlist.
        // Paths with a dot (icons, images, robots.txt) and /_next/static are excluded.
        // Next already sends public, max-age=31536000, immutable for hashed static files.
        source: "/",
        headers: documentNoStore,
      },
      {
        source: "/:path((?!_next/static|_next/image|.*\\..*).*)",
        headers: documentNoStore,
      },
    ];
  },
};

export default nextConfig;
