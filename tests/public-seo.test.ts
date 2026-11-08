import { describe, expect, it } from "vitest";
import { buildPublicPageMetadata } from "@/shared/seo/build-public-page-metadata";
import { legalDocumentList } from "@/content/legal-pages";

describe("public SEO helpers", () => {
  it("builds canonical and social metadata for homepage", () => {
    const metadata = buildPublicPageMetadata({
      title: "Test Title",
      description: "Test description",
      path: "/",
    });

    expect(metadata.alternates?.canonical).toBe("/");
    expect(metadata.openGraph?.url).toBe("https://vaadclick.co.il/");
    expect(metadata.twitter).toMatchObject({ card: "summary_large_image" });
    expect(metadata.title).toEqual({ absolute: "Test Title" });
  });

  it("can mark draft legal pages as noindex", () => {
    const metadata = buildPublicPageMetadata({
      title: "Privacy",
      description: "Draft",
      path: "/privacy",
      noIndex: true,
    });
    expect(metadata.robots).toMatchObject({ index: false, follow: true });
  });

  it("tracks privacy as draft while terms and accessibility are published", () => {
    const privacy = legalDocumentList.find((p) => p.path === "/privacy");
    const terms = legalDocumentList.find((p) => p.path === "/terms");
    const accessibility = legalDocumentList.find((p) => p.path === "/accessibility");
    expect(privacy?.publicationStatus).toBe("draft_pending_approval");
    expect(terms?.publicationStatus).toBe("published");
    expect(accessibility?.publicationStatus).toBe("published");
  });
});
