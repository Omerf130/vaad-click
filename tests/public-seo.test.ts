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

  it("tracks legal pages as draft pending approval", () => {
    expect(
      legalDocumentList.every((page) => page.publicationStatus === "draft_pending_approval"),
    ).toBe(true);
  });
});
