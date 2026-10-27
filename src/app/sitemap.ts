import type { MetadataRoute } from "next";
import { SITE_URL } from "@/shared/seo/site";

/** Public routes suitable for discovery (draft legal pages remain noindex). */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return ["/", "/privacy", "/terms", "/accessibility"].map((path) => ({
    url: new URL(path, SITE_URL).toString(),
    lastModified: now,
    changeFrequency: path === "/" ? ("monthly" as const) : ("yearly" as const),
    priority: path === "/" ? 1 : 0.3,
  }));
}
