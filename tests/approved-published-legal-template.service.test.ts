import { beforeEach, describe, expect, it, vi } from "vitest";

import { computeLegalDocumentTemplateContentSha256 } from "@/modules/legal-document-templates/domain/legal-document-template-content-hash";
import { LegalDocumentTemplateCategory } from "@/modules/legal-document-templates/domain/legal-document-template-category";
import { LegalDocumentTemplateRevisionStatus } from "@/modules/legal-document-templates/domain/legal-document-template-revision-status";
import { resolveApprovedPublishedLegalTemplateRevision } from "@/modules/legal-document-templates/services/approved-published-legal-template.service";

const mockTemplateFindOne = vi.fn();
const mockRevisionFindOne = vi.fn();
const mockApprovalFindOne = vi.fn();

vi.mock("@/shared/db/connect", () => ({
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/modules/legal-document-templates/infra/legal-document-template.model", () => ({
  LegalDocumentTemplate: {
    findOne: (...args: unknown[]) => mockTemplateFindOne(...args),
  },
}));

vi.mock("@/modules/legal-document-templates/infra/legal-document-template-revision.model", () => ({
  LegalDocumentTemplateRevision: {
    findOne: (...args: unknown[]) => mockRevisionFindOne(...args),
  },
}));

vi.mock("@/modules/legal-document-templates/infra/legal-document-template-approval.model", () => ({
  LegalDocumentTemplateApproval: {
    findOne: (...args: unknown[]) => mockApprovalFindOne(...args),
  },
}));

describe("resolveApprovedPublishedLegalTemplateRevision", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when no published template pointer exists", async () => {
    mockTemplateFindOne.mockReturnValue({ lean: async () => null });
    await expect(
      resolveApprovedPublishedLegalTemplateRevision(
        LegalDocumentTemplateCategory.POWER_OF_ATTORNEY,
      ),
    ).resolves.toBeNull();
  });

  it("returns null for draft-only revision even if pointer exists", async () => {
    mockTemplateFindOne.mockReturnValue({
      lean: async () => ({
        templateId: "tpl-1",
        latestPublishedRevisionId: "rev-draft",
      }),
    });
    mockRevisionFindOne.mockReturnValue({ lean: async () => null });
    await expect(
      resolveApprovedPublishedLegalTemplateRevision(
        LegalDocumentTemplateCategory.FEE_AGREEMENT,
      ),
    ).resolves.toBeNull();
  });

  it("returns published revision only with matching approval and hash", async () => {
    const revisionId = "11111111-1111-4111-8111-111111111111";
    const bodyText = "ניסוח מאושר";
    const contentSha256 = computeLegalDocumentTemplateContentSha256({
      category: LegalDocumentTemplateCategory.DECLARATION,
      revisionId,
      bodyText,
    });
    mockTemplateFindOne.mockReturnValue({
      lean: async () => ({
        templateId: "tpl-2",
        latestPublishedRevisionId: revisionId,
      }),
    });
    mockRevisionFindOne.mockReturnValue({
      lean: async () => ({
        revisionId,
        revisionNumber: 4,
        bodyText,
        contentSha256,
        lifecycleStatus: LegalDocumentTemplateRevisionStatus.PUBLISHED,
        publishedAt: new Date("2026-01-01"),
      }),
    });
    mockApprovalFindOne.mockReturnValue({
      lean: async () => ({ revisionId, contentSha256 }),
    });

    const result = await resolveApprovedPublishedLegalTemplateRevision(
      LegalDocumentTemplateCategory.DECLARATION,
    );
    expect(result?.revisionNumber).toBe(4);
    expect(result?.bodyText).toBe(bodyText);
  });

  it("rejects when approval hash does not match revision", async () => {
    const revisionId = "22222222-2222-4222-8222-222222222222";
    const bodyText = "טקסט";
    const contentSha256 = computeLegalDocumentTemplateContentSha256({
      category: LegalDocumentTemplateCategory.POWER_OF_ATTORNEY,
      revisionId,
      bodyText,
    });
    mockTemplateFindOne.mockReturnValue({
      lean: async () => ({
        templateId: "tpl-3",
        latestPublishedRevisionId: revisionId,
      }),
    });
    mockRevisionFindOne.mockReturnValue({
      lean: async () => ({
        revisionId,
        revisionNumber: 1,
        bodyText,
        contentSha256,
        lifecycleStatus: LegalDocumentTemplateRevisionStatus.PUBLISHED,
      }),
    });
    mockApprovalFindOne.mockReturnValue({ lean: async () => null });

    await expect(
      resolveApprovedPublishedLegalTemplateRevision(
        LegalDocumentTemplateCategory.POWER_OF_ATTORNEY,
      ),
    ).resolves.toBeNull();
  });
});
