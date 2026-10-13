import { describe, expect, it } from "vitest";
import { buildPublicPageMetadata } from "@/shared/seo/build-public-page-metadata";
import { PLANNED_LEGAL_PAGES } from "@/content/legal-pages";

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

  it("tracks legal pages as pending without publishing routes", () => {
    expect(
      PLANNED_LEGAL_PAGES.every((page) => page.contentStatus === "pending_lawyer"),
    ).toBe(true);
  });
});
