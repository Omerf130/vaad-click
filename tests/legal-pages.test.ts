import { describe, expect, it } from "vitest";

import { legalDocumentLinkLabel } from "@/content/legal/legal-document-display";
import { legalDocumentList, legalDocuments } from "@/content/legal-pages";

describe("legal pages foundation", () => {
  it("exposes privacy, terms, and accessibility", () => {
    expect(legalDocumentList).toHaveLength(3);
    for (const doc of legalDocumentList) {
      expect(doc.path).toMatch(/^\//);
      expect(doc.seoDescription.length).toBeGreaterThan(10);
    }
  });

  it("uses stable paths for footer and registration links", () => {
    expect(legalDocuments.privacy.path).toBe("/privacy");
    expect(legalDocuments.terms.path).toBe("/terms");
    expect(legalDocuments.accessibility.path).toBe("/accessibility");
  });

  it("labels published terms without draft suffix", () => {
    expect(legalDocumentLinkLabel(legalDocuments.terms)).toBe("תנאי שימוש");
    expect(legalDocumentLinkLabel(legalDocuments.accessibility)).toBe("הצהרת נגישות");
  });

  it("still marks privacy as draft when body missing", () => {
    expect(legalDocuments.privacy.showDraftChrome).toBe(true);
    expect(legalDocumentLinkLabel(legalDocuments.privacy)).toContain("טיוטה");
  });
});
