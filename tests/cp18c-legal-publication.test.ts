import { describe, expect, it } from "vitest";

import {
  ACCESSIBILITY_STATEMENT_SECTION_TITLES,
  accessibilityStatementBody,
} from "@/content/legal/accessibility-statement.body";
import {
  LEGAL_OFFICIAL_DOCUMENT_DATE_DISPLAY,
  TERMS_OF_USE_SECTION_5_6_JURISDICTION,
} from "@/content/legal/legal-publication-config";
import {
  TERMS_OF_USE_LEAF_SECTION_NUMBERS,
  TERMS_OF_USE_MAJOR_SECTION_NUMBERS,
  termsOfUseBody,
} from "@/content/legal/terms-of-use.body";
import { legalDocuments } from "@/content/legal-pages";

function findTermsSection(number: string) {
  return termsOfUseBody.sections.find((section) => section.number === number);
}

describe("CP18C legal publication", () => {
  it("uses fixed official document date 06.11.2026", () => {
    expect(LEGAL_OFFICIAL_DOCUMENT_DATE_DISPLAY).toBe("06.11.2026");
  });

  it("publishes terms and accessibility without draft chrome", () => {
    expect(legalDocuments.terms.hasAuthoritativeBody).toBe(true);
    expect(legalDocuments.terms.showDraftChrome).toBe(false);
    expect(legalDocuments.terms.publicationStatus).toBe("published");
    expect(legalDocuments.accessibility.hasAuthoritativeBody).toBe(true);
    expect(legalDocuments.accessibility.showDraftChrome).toBe(false);
  });

  it("includes terms sections 1–5.7", () => {
    for (const major of TERMS_OF_USE_MAJOR_SECTION_NUMBERS) {
      expect(termsOfUseBody.sections.some((s) => s.number === major)).toBe(true);
    }
    for (const leaf of TERMS_OF_USE_LEAF_SECTION_NUMBERS) {
      expect(findTermsSection(leaf)).toBeDefined();
    }
    expect(findTermsSection("5.7")).toBeDefined();
  });

  it("section 5.6 specifies Haifa jurisdiction", () => {
    const section = findTermsSection("5.6");
    expect(section).toBeDefined();
    const text = section!.blocks
      .filter((b) => b.type === "paragraph")
      .map((b) => b.text)
      .join(" ");
    expect(text).toBe(TERMS_OF_USE_SECTION_5_6_JURISDICTION);
    expect(text).toContain("בחיפה");
  });

  it("includes accessibility substantive sections", () => {
    expect(accessibilityStatementBody.sections).toHaveLength(
      ACCESSIBILITY_STATEMENT_SECTION_TITLES.length,
    );
    for (const title of ACCESSIBILITY_STATEMENT_SECTION_TITLES) {
      expect(accessibilityStatementBody.sections.some((s) => s.title === title)).toBe(
        true,
      );
    }
  });

  it("shows update date in terms 5.7 and accessibility contact section", () => {
    const termsFooter = findTermsSection("5.7")!
      .blocks.filter((b) => b.type === "paragraph")
      .map((b) => b.text)
      .join(" ");
    expect(termsFooter).toContain("06.11.2026");

    const a11yFooter = accessibilityStatementBody.sections
      .find((s) => s.title === "רכז נגישות ופניות")!
      .blocks.filter((b) => b.type === "paragraph")
      .map((b) => b.text)
      .join(" ");
    expect(a11yFooter).toContain("06.11.2026");
  });
});
