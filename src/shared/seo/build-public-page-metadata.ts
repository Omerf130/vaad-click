import type { Metadata } from "next";
import { SITE_LOCALE, SITE_NAME, SITE_URL } from "./site";

type PublicPageMetadataInput = {
  /** Full document title (avoids layout template duplication). */
  title: string;
  description: string;
  /** Pathname starting with `/`, e.g. `/` */
  path: string;
};

export function buildPublicPageMetadata({
  title,
  description,
  path,
}: PublicPageMetadataInput): Metadata {
  const canonicalPath = path === "/" ? "/" : path.replace(/\/$/, "");
  const canonicalUrl = new URL(canonicalPath, SITE_URL).toString();

  return {
    title: { absolute: title },
    description,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: SITE_NAME,
      locale: SITE_LOCALE,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}
