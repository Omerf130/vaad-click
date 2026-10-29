import { describe, expect, it } from "vitest";

import { LegalDocumentTemplateRevision } from "@/modules/legal-document-templates/infra/legal-document-template-revision.model";
import { LegalDocumentTemplateCategory } from "@/modules/legal-document-templates/domain/legal-document-template-category";
import { LegalDocumentTemplateRevisionStatus } from "@/modules/legal-document-templates/domain/legal-document-template-revision-status";
import { Types } from "mongoose";

describe("LegalDocumentTemplateRevision model", () => {
  it("accepts empty bodyText for an empty draft (regression CP13B.1)", async () => {
    const doc = new LegalDocumentTemplateRevision({
      revisionId: "770e8400-e29b-41d4-a716-446655440000",
      templateId: "880e8400-e29b-41d4-a716-446655440001",
      category: LegalDocumentTemplateCategory.POWER_OF_ATTORNEY,
      revisionNumber: 1,
      bodyText: "",
      contentSha256: "a".repeat(64),
      lifecycleStatus: LegalDocumentTemplateRevisionStatus.DRAFT,
      isCurrentDraft: true,
      createdByUserId: new Types.ObjectId("507f1f77bcf86cd799439011"),
      publishedAt: null,
    });
    await expect(doc.validate()).resolves.toBeUndefined();
  });
});
