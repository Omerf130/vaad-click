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
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import { evaluateBuildingLegalReadiness } from "@/modules/debt-cases/domain/debt-case-legal-readiness";
import { LawyerVerificationStatus } from "@/modules/buildings/domain/building-status";

const BUILDING_A = "11111111-1111-4111-8111-111111111111";
const BUILDING_B = "22222222-2222-4222-8222-222222222222";
const DOC_ID = "33333333-3333-4333-8333-333333333333";

const mockDocFindOne = vi.fn();
const mockDocFind = vi.fn();
const mockDocCount = vi.fn();
const mockBuildingFindOne = vi.fn();
const mockUserFind = vi.fn();
const mockAssertBuildingAccess = vi.fn();

vi.mock("@/shared/db/connect", () => ({
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/modules/building-legal-documents/infra/building-legal-document.model", () => ({
  BuildingLegalDocument: {
    findOne: (...args: unknown[]) => mockDocFindOne(...args),
    find: (...args: unknown[]) => mockDocFind(...args),
    countDocuments: (...args: unknown[]) => mockDocCount(...args),
  },
}));

vi.mock("@/modules/buildings/infra/building.model", () => ({
  Building: {
    findOne: (...args: unknown[]) => mockBuildingFindOne(...args),
  },
}));

vi.mock("@/modules/users/infra/user.model", () => ({
  User: {
    find: (...args: unknown[]) => mockUserFind(...args),
  },
}));

function mockUserFindChain(rows: unknown[]) {
  mockUserFind.mockReturnValue({
    select: () => ({
      lean: async () => rows,
    }),
  });
}

vi.mock("@/shared/auth/building-access/assert-building-access", () => ({
  assertBuildingAccess: (...args: unknown[]) => mockAssertBuildingAccess(...args),
}));

vi.mock(
  "@/modules/legal-document-templates/services/approved-published-legal-template.service",
  () => ({
    resolveApprovedPublishedLegalTemplateRevision: vi.fn().mockResolvedValue(null),
  }),
);

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

const repContext: AuthenticatedContext = {
  ...lawyerContext,
  user: { ...lawyerContext.user, role: UserRole.BUILDING_REP },
};

function activeDoc(overrides: Partial<{ buildingId: string; status: string }> = {}) {
  return {
    buildingLegalDocumentId: DOC_ID,
    buildingId: BUILDING_A,
    category: LegalDocumentTemplateCategory.POWER_OF_ATTORNEY,
    templateRevisionNumber: 2,
    status: BuildingLegalDocumentStatus.GENERATED_PENDING_SIGNATURE,
    createdAt: new Date("2026-01-15T10:00:00.000Z"),
    supersededAt: null,
    createdByUserId: { toString: () => lawyerContext.user.id },
    renderedContentSnapshot: "immutable snapshot text",
    ...overrides,
  };
}

describe("getBuildingLegalDocumentPreview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDocFindOne.mockReturnValue({ lean: async () => activeDoc() });
    mockUserFindChain([{ _id: { toString: () => lawyerContext.user.id }, fullName: "Lawyer" }]);
    mockAssertBuildingAccess.mockResolvedValue({ scope: {} });
  });

  it("returns immutable snapshot for lawyer admin", async () => {
    const { getBuildingLegalDocumentPreview } = await import(
      "@/modules/building-legal-documents/services/building-legal-document.service"
    );

    const preview = await getBuildingLegalDocumentPreview({
      context: lawyerContext,
      buildingLegalDocumentId: DOC_ID,
      expectedBuildingId: BUILDING_A,
    });

    expect(preview.renderedContentSnapshot).toBe("immutable snapshot text");
    expect(preview.templateRevisionNumber).toBe(2);
  });

  it("rejects cross-building URL mismatch", async () => {
    const { getBuildingLegalDocumentPreview } = await import(
      "@/modules/building-legal-documents/services/building-legal-document.service"
    );

    await expect(
      getBuildingLegalDocumentPreview({
        context: lawyerContext,
        buildingLegalDocumentId: DOC_ID,
        expectedBuildingId: BUILDING_B,
      }),
    ).rejects.toMatchObject({ code: BuildingLegalDocumentErrorCode.FORBIDDEN });
  });

  it("requires building access for portal operators", async () => {
    const { getBuildingLegalDocumentPreview } = await import(
      "@/modules/building-legal-documents/services/building-legal-document.service"
    );

    await getBuildingLegalDocumentPreview({
      context: repContext,
      buildingLegalDocumentId: DOC_ID,
      expectedBuildingId: BUILDING_A,
      portalActiveOnly: true,
    });

    expect(mockAssertBuildingAccess).toHaveBeenCalledWith(
      expect.objectContaining({ buildingPublicId: BUILDING_A }),
    );
  });

  it("rejects superseded documents in portal preview", async () => {
    mockDocFindOne.mockReturnValue({
      lean: async () =>
        activeDoc({ status: BuildingLegalDocumentStatus.SUPERSEDED }),
    });

    const { getBuildingLegalDocumentPreview } = await import(
      "@/modules/building-legal-documents/services/building-legal-document.service"
    );

    await expect(
      getBuildingLegalDocumentPreview({
        context: repContext,
        buildingLegalDocumentId: DOC_ID,
        expectedBuildingId: BUILDING_A,
        portalActiveOnly: true,
      }),
    ).rejects.toMatchObject({ code: BuildingLegalDocumentErrorCode.FORBIDDEN });
  });

  it("returns not found for missing document id", async () => {
    mockDocFindOne.mockReturnValue({ lean: async () => null });

    const { getBuildingLegalDocumentPreview } = await import(
      "@/modules/building-legal-documents/services/building-legal-document.service"
    );

    await expect(
      getBuildingLegalDocumentPreview({
        context: lawyerContext,
        buildingLegalDocumentId: DOC_ID,
      }),
    ).rejects.toBeInstanceOf(BuildingLegalDocumentError);
  });
});

describe("loadBuildingLegalDocumentsAdminView history", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBuildingFindOne.mockReturnValue({
      lean: async () => ({ buildingId: BUILDING_A }),
    });
    mockDocCount.mockResolvedValue(3);
    mockUserFindChain([]);
    mockDocFindOne.mockReturnValue({ lean: async () => null });
    mockDocFind.mockReturnValue({
      sort: () => ({
        limit: () => ({
          lean: async () => [
            {
              buildingLegalDocumentId: "old-2",
              buildingId: BUILDING_A,
              category: LegalDocumentTemplateCategory.POWER_OF_ATTORNEY,
              templateRevisionNumber: 2,
              status: BuildingLegalDocumentStatus.SUPERSEDED,
              createdAt: new Date("2026-02-01T00:00:00.000Z"),
              supersededAt: new Date("2026-03-01T00:00:00.000Z"),
              createdByUserId: { toString: () => "u1" },
            },
            {
              buildingLegalDocumentId: "old-1",
              buildingId: BUILDING_A,
              category: LegalDocumentTemplateCategory.POWER_OF_ATTORNEY,
              templateRevisionNumber: 1,
              status: BuildingLegalDocumentStatus.SUPERSEDED,
              createdAt: new Date("2026-01-01T00:00:00.000Z"),
              supersededAt: new Date("2026-02-01T00:00:00.000Z"),
              createdByUserId: { toString: () => "u1" },
            },
          ],
        }),
      }),
    });
  });

  it("orders superseded history newest first without snapshots in list", async () => {
    const { loadBuildingLegalDocumentsAdminView } = await import(
      "@/modules/building-legal-documents/services/building-legal-document.service"
    );

    const rows = await loadBuildingLegalDocumentsAdminView({
      context: lawyerContext,
      buildingId: BUILDING_A,
    });

    const poa = rows.find((r) => r.category === LegalDocumentTemplateCategory.POWER_OF_ATTORNEY);
    expect(poa?.supersededHistory[0]?.buildingLegalDocumentId).toBe("old-2");
    expect(poa?.supersededHistory[1]?.buildingLegalDocumentId).toBe("old-1");
    expect(poa?.supersededHistory[0]).not.toHaveProperty("renderedContentSnapshot");
  });
});

describe("legal readiness unchanged by preview CP16A", () => {
  it("preview work does not alter readiness evaluation inputs", () => {
    const result = evaluateBuildingLegalReadiness({
      lawyerVerificationStatus: LawyerVerificationStatus.NOT_STARTED,
      engagementSigned: false,
      poaSigned: false,
      legacyFastTrackEligible: false,
    });
    expect(result.legalTreatmentAllowed).toBe(false);
  });
});
