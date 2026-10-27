import { describe, expect, it } from "vitest";

import { legalDocumentList, legalDocuments } from "@/content/legal-pages";

describe("legal pages foundation", () => {
  it("exposes privacy, terms, and accessibility as draft-only", () => {
    expect(legalDocumentList).toHaveLength(3);
    for (const doc of legalDocumentList) {
      expect(doc.publicationStatus).toBe("draft_pending_approval");
      expect(doc.draftNoticeTitle).toMatch(/טיוטה/);
    }
  });

  it("uses stable paths for footer and registration links", () => {
    expect(legalDocuments.privacy.path).toBe("/privacy");
    expect(legalDocuments.terms.path).toBe("/terms");
    expect(legalDocuments.accessibility.path).toBe("/accessibility");
  });
});
