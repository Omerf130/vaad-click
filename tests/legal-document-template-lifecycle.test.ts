import { beforeEach, describe, expect, it, vi } from "vitest";

import { SessionAuthStage } from "@/modules/auth/domain/session-types";
import { computeLegalDocumentTemplateContentSha256 } from "@/modules/legal-document-templates/domain/legal-document-template-content-hash";
import {
  LegalDocumentTemplateError,
  LegalDocumentTemplateErrorCode,
} from "@/modules/legal-document-templates/domain/legal-document-template-errors";
import { evaluatePublishEligibility } from "@/modules/legal-document-templates/domain/legal-document-template-lifecycle.rules";
import { LegalDocumentTemplateCategory } from "@/modules/legal-document-templates/domain/legal-document-template-category";
import { LegalDocumentTemplateRevisionStatus } from "@/modules/legal-document-templates/domain/legal-document-template-revision-status";
import {
  approveLegalDocumentTemplateRevision,
  publishLegalDocumentTemplateRevision,
} from "@/modules/legal-document-templates/services/legal-document-template.service";
import { AccountStatus } from "@/modules/users/domain/account-status";
import { UserRole } from "@/modules/users/domain/user-role";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import { computeWarningLetterTemplateVariantContentSha256 } from "@/modules/warning-letters/domain/warning-letter-template-variant-content-hash";
import { WarningLetterUnapprovedTemplateVariant } from "@/modules/warning-letters/domain/warning-letter-unapproved-template-variant";
import { INITIAL_WARNING_TEMPLATE_VERSION_ID } from "@/modules/warning-letters/domain/warning-letter-type";
import { LawyerVerificationStatus } from "@/modules/buildings/domain/building-status";
import { evaluateBuildingLegalReadiness } from "@/modules/debt-cases/domain/debt-case-legal-readiness";

const mockFindOneRevision = vi.fn();
const mockFindOneApproval = vi.fn();
const mockCreateApproval = vi.fn();
const mockWriteAudit = vi.fn();

vi.mock("@/shared/db/connect", () => ({
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/modules/legal-document-templates/infra/legal-document-template-revision.model", () => ({
  LegalDocumentTemplateRevision: {
    findOne: (...args: unknown[]) => mockFindOneRevision(...args),
    updateOne: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock("@/modules/legal-document-templates/infra/legal-document-template-approval.model", () => ({
  LegalDocumentTemplateApproval: {
    findOne: (...args: unknown[]) => mockFindOneApproval(...args),
    create: (...args: unknown[]) => mockCreateApproval(...args),
  },
}));

vi.mock("@/modules/legal-document-templates/infra/legal-document-template.model", () => ({
  LegalDocumentTemplate: {
    findOne: vi.fn(),
    updateOne: vi.fn(),
    find: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock("@/modules/audit/services/audit-writer.service", () => ({
  writeAuditEvent: (...args: unknown[]) => mockWriteAudit(...args),
  writeAuditEventMandatory: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("mongoose", async () => {
  const actual = await vi.importActual<typeof import("mongoose")>("mongoose");
  return {
    default: {
      startSession: () => ({
        withTransaction: async (fn: () => Promise<void>) => fn(),
        endSession: vi.fn(),
      }),
    },
    Types: actual.Types,
  };
});

const lawyerContext: AuthenticatedContext = {
  user: {
    id: "507f1f77bcf86cd799439011",
    fullName: "Lawyer",
    email: "lawyer@example.com",
    role: UserRole.LAWYER_ADMIN,
    accountStatus: AccountStatus.ACTIVE,
  },
  session: {
    userId: "507f1f77bcf86cd799439011",
    authStage: SessionAuthStage.MFA_COMPLETE,
    expiresAt: new Date(Date.now() + 60_000),
    revokedAt: null,
  },
};

const buildingRepContext: AuthenticatedContext = {
  ...lawyerContext,
  user: { ...lawyerContext.user, role: UserRole.BUILDING_REP },
};

describe("legal document template lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("computes stable SHA-256 per revision content", () => {
    const hashA = computeLegalDocumentTemplateContentSha256({
      category: LegalDocumentTemplateCategory.POWER_OF_ATTORNEY,
      revisionId: "11111111-1111-4111-8111-111111111111",
      bodyText: "טקסט",
    });
    const hashB = computeLegalDocumentTemplateContentSha256({
      category: LegalDocumentTemplateCategory.POWER_OF_ATTORNEY,
      revisionId: "11111111-1111-4111-8111-111111111111",
      bodyText: "טקסט",
    });
    expect(hashA).toBe(hashB);
    expect(hashA).toMatch(/^[a-f0-9]{64}$/);
  });

  it("rejects publish without approval", () => {
    const result = evaluatePublishEligibility({
      lifecycleStatus: LegalDocumentTemplateRevisionStatus.DRAFT,
      isCurrentDraft: true,
      contentSha256: "abc",
      approvalContentSha256: null,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe(LegalDocumentTemplateErrorCode.APPROVAL_REQUIRED);
    }
  });

  it("rejects publish when approval hash differs", () => {
    const result = evaluatePublishEligibility({
      lifecycleStatus: LegalDocumentTemplateRevisionStatus.DRAFT,
      isCurrentDraft: true,
      contentSha256: "abc",
      approvalContentSha256: "def",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe(LegalDocumentTemplateErrorCode.CONTENT_HASH_MISMATCH);
    }
  });

  it("blocks non-lawyer from approval", async () => {
    await expect(
      approveLegalDocumentTemplateRevision({
        context: buildingRepContext,
        revisionId: "11111111-1111-4111-8111-111111111111",
      }),
    ).rejects.toMatchObject({ code: LegalDocumentTemplateErrorCode.FORBIDDEN });
  });

  it("blocks publish without matching approval record", async () => {
    const revisionId = "22222222-2222-4222-8222-222222222222";
    const bodyText = "ניסוח";
    const contentSha256 = computeLegalDocumentTemplateContentSha256({
      category: LegalDocumentTemplateCategory.DECLARATION,
      revisionId,
      bodyText,
    });
    mockFindOneRevision.mockReturnValue({
      lean: async () => ({
        revisionId,
        templateId: "tpl-1",
        category: LegalDocumentTemplateCategory.DECLARATION,
        bodyText,
        contentSha256,
        lifecycleStatus: LegalDocumentTemplateRevisionStatus.DRAFT,
        isCurrentDraft: true,
      }),
    });
    mockFindOneApproval.mockReturnValue({ lean: async () => null });

    await expect(
      publishLegalDocumentTemplateRevision({
        context: lawyerContext,
        revisionId,
      }),
    ).rejects.toBeInstanceOf(LegalDocumentTemplateError);

    expect(mockWriteAudit).toHaveBeenCalled();
  });

  it("creates approval only on explicit lawyer approve action", async () => {
    const revisionId = "33333333-3333-4333-8333-333333333333";
    const bodyText = "טיוטה";
    const contentSha256 = computeLegalDocumentTemplateContentSha256({
      category: LegalDocumentTemplateCategory.FEE_AGREEMENT,
      revisionId,
      bodyText,
    });
    mockFindOneRevision.mockReturnValue({
      lean: async () => ({
        revisionId,
        templateId: "tpl-2",
        category: LegalDocumentTemplateCategory.FEE_AGREEMENT,
        bodyText,
        contentSha256,
        lifecycleStatus: LegalDocumentTemplateRevisionStatus.DRAFT,
        isCurrentDraft: true,
      }),
    });
    mockFindOneApproval.mockReturnValue({ lean: async () => null });
    mockCreateApproval.mockResolvedValue(undefined);

    await approveLegalDocumentTemplateRevision({
      context: lawyerContext,
      revisionId,
    });

    expect(mockCreateApproval).toHaveBeenCalledTimes(1);
  });

  it("does not alter legal-readiness gates (poaSigned still required explicitly)", () => {
    const readiness = evaluateBuildingLegalReadiness({
      lawyerVerificationStatus: LawyerVerificationStatus.VERIFIED,
      engagementSigned: true,
      poaSigned: false,
      legacyFastTrackEligible: false,
    });
    expect(readiness.legalTreatmentAllowed).toBe(false);
  });

  it("treats published revisions as immutable for publish eligibility", () => {
    const result = evaluatePublishEligibility({
      lifecycleStatus: LegalDocumentTemplateRevisionStatus.PUBLISHED,
      isCurrentDraft: false,
      contentSha256: "abc",
      approvalContentSha256: "abc",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe(LegalDocumentTemplateErrorCode.ALREADY_PUBLISHED);
    }
  });

  it("does not change warning-letter template variant hash behavior", () => {
    const hash = computeWarningLetterTemplateVariantContentSha256({
      variantId: WarningLetterUnapprovedTemplateVariant.COMMITTEE_INTRO,
      templateVersionId: INITIAL_WARNING_TEMPLATE_VERSION_ID,
    });
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });
});
