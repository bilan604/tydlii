import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const updated = new Date("2026-11-04");
  return [
    {
      url: SITE.url,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE.url}/privacy`,
      lastModified: updated,
      changeFrequency: "yearly",
      priority: 0.4,
    },
    {
      url: `${SITE.url}/terms`,
      lastModified: updated,
      changeFrequency: "yearly",
      priority: 0.4,
    },
  ];
}
