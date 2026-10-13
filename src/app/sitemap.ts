import type { MetadataRoute } from "next";
import { SITE_URL } from "@/shared/seo/site";

/** Only routes that exist publicly at this checkpoint. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: new URL("/", SITE_URL).toString(),
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
