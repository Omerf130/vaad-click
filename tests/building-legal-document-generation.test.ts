import { beforeEach, describe, expect, it, vi } from "vitest";

import { SessionAuthStage } from "@/modules/auth/domain/session-types";
import {
  BuildingLegalDocumentError,
  BuildingLegalDocumentErrorCode,
} from "@/modules/building-legal-documents/domain/building-legal-document-errors";
import { BuildingLegalDocumentStatus } from "@/modules/building-legal-documents/domain/building-legal-document-status";
import { LegalDocumentTemplateCategory } from "@/modules/legal-document-templates/domain/legal-document-template-category";
import { AccountStatus } from "@/modules/users/domain/account-status";
import { UserRole } from "@/modules/users/domain/user-role";
import { BuildingOrganizationalStatus } from "@/modules/buildings/domain/building-status";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import { evaluateBuildingLegalReadiness } from "@/modules/debt-cases/domain/debt-case-legal-readiness";
import { LawyerVerificationStatus } from "@/modules/buildings/domain/building-status";

const mockResolvePublished = vi.fn();
const mockBuildingFindOne = vi.fn();
const mockDocFindOne = vi.fn();
const mockDocUpdateOne = vi.fn();
const mockDocCreate = vi.fn();
const mockWriteAuditMandatory = vi.fn();

vi.mock("@/shared/db/connect", () => ({
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

vi.mock(
  "@/modules/legal-document-templates/services/approved-published-legal-template.service",
  () => ({
    resolveApprovedPublishedLegalTemplateRevision: (...args: unknown[]) =>
      mockResolvePublished(...args),
  }),
);

vi.mock("@/modules/buildings/infra/building.model", () => ({
  Building: {
    findOne: (...args: unknown[]) => mockBuildingFindOne(...args),
  },
}));

vi.mock("@/modules/building-legal-documents/infra/building-legal-document.model", () => ({
  BuildingLegalDocument: {
    findOne: (...args: unknown[]) => mockDocFindOne(...args),
    updateOne: (...args: unknown[]) => mockDocUpdateOne(...args),
    create: (...args: unknown[]) => mockDocCreate(...args),
    countDocuments: vi.fn(),
  },
}));

vi.mock("@/modules/audit/services/audit-writer.service", () => ({
  writeAuditEventMandatory: (...args: unknown[]) => mockWriteAuditMandatory(...args),
}));

vi.mock("mongoose", async (importOriginal) => {
  const actual = await importOriginal<typeof import("mongoose")>();
  return {
    ...actual,
    default: {
      ...actual.default,
      startSession: () => ({
        withTransaction: async (fn: () => Promise<void>) => fn(),
        endSession: vi.fn(),
      }),
    },
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

import { generateBuildingLegalDocument } from "@/modules/building-legal-documents/services/building-legal-document.service";

describe("building legal document generation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBuildingFindOne.mockReturnValue({
      lean: async () => ({
        buildingId: "bld-1",
        organizationalStatus: BuildingOrganizationalStatus.ACTIVE,
      }),
    });
    mockResolvePublished.mockResolvedValue({
      templateId: "tpl-1",
      revisionId: "11111111-1111-4111-8111-111111111111",
      revisionNumber: 2,
      contentSha256: "a".repeat(64),
      bodyText: "snapshot text",
    });
    mockDocFindOne.mockReturnValue({ session: () => ({ lean: async () => null }) });
    mockDocUpdateOne.mockResolvedValue({ modifiedCount: 1 });
    mockDocCreate.mockResolvedValue(undefined);
    mockWriteAuditMandatory.mockResolvedValue(undefined);
  });

  it("rejects non-lawyer generation", async () => {
    await expect(
      generateBuildingLegalDocument({
        context: buildingRepContext,
        buildingId: "bld-1",
        category: LegalDocumentTemplateCategory.POWER_OF_ATTORNEY,
      }),
    ).rejects.toMatchObject({ code: BuildingLegalDocumentErrorCode.FORBIDDEN });
  });

  it("rejects generation without approved published template", async () => {
    mockResolvePublished.mockResolvedValue(null);
    await expect(
      generateBuildingLegalDocument({
        context: lawyerContext,
        buildingId: "bld-1",
        category: LegalDocumentTemplateCategory.FEE_AGREEMENT,
      }),
    ).rejects.toMatchObject({ code: BuildingLegalDocumentErrorCode.TEMPLATE_NOT_APPROVED });
  });

  it("creates instance with immutable snapshot and supersedes active document", async () => {
    mockDocFindOne.mockReturnValue({
      session: () => ({
        lean: async () => ({
          buildingLegalDocumentId: "old-doc",
          status: BuildingLegalDocumentStatus.GENERATED_PENDING_SIGNATURE,
        }),
      }),
    });
    const result = await generateBuildingLegalDocument({
      context: lawyerContext,
      buildingId: "bld-1",
      category: LegalDocumentTemplateCategory.DECLARATION,
    });
    expect(result.supersededDocumentId).toBe("old-doc");
    expect(mockDocCreate).toHaveBeenCalled();
    const createPayload = mockDocCreate.mock.calls[0]?.[0]?.[0];
    expect(createPayload.renderedContentSnapshot).toBe("snapshot text");
    expect(createPayload.status).toBe(BuildingLegalDocumentStatus.GENERATED_PENDING_SIGNATURE);
    expect(createPayload).not.toHaveProperty("signedAt");
  });

  it("does not introduce signed state or change legal readiness gates", () => {
    const readiness = evaluateBuildingLegalReadiness({
      lawyerVerificationStatus: LawyerVerificationStatus.VERIFIED,
      engagementSigned: true,
      poaSigned: false,
      legacyFastTrackEligible: false,
    });
    expect(readiness.legalTreatmentAllowed).toBe(false);
    expect(
      Object.values(BuildingLegalDocumentStatus).some((value) => value.includes("signed")),
    ).toBe(false);
  });

  it("maps concurrent supersede failure to error code", async () => {
    mockDocFindOne.mockReturnValue({
      session: () => ({
        lean: async () => ({
          buildingLegalDocumentId: "old-doc",
          status: BuildingLegalDocumentStatus.GENERATED_PENDING_SIGNATURE,
        }),
      }),
    });
    mockDocUpdateOne.mockResolvedValue({ modifiedCount: 0 });
    await expect(
      generateBuildingLegalDocument({
        context: lawyerContext,
        buildingId: "bld-1",
        category: LegalDocumentTemplateCategory.POWER_OF_ATTORNEY,
      }),
    ).rejects.toBeInstanceOf(BuildingLegalDocumentError);
  });
});
