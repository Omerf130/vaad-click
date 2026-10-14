import { beforeEach, describe, expect, it, vi } from "vitest";

import { DocumentClassification } from "@/modules/document-assets/domain/document-classification";
import { DocumentAssetErrorCode } from "@/modules/document-assets/domain/document-asset-errors";
import { AccountStatus } from "@/modules/users/domain/account-status";
import { UserRole } from "@/modules/users/domain/user-role";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";

const BUILDING_ID = "11111111-1111-4111-8111-111111111111";

const mockAssertLawyerAdmin = vi.fn();
const mockBuildingFindOne = vi.fn();
const mockRecordUploadRejected = vi.fn();

vi.mock("@/modules/organizations/services/assert-lawyer-admin", () => ({
  assertLawyerAdminOrganization: (...args: unknown[]) => mockAssertLawyerAdmin(...args),
}));

vi.mock("@/modules/buildings/infra/building.model", () => ({
  Building: {
    findOne: (...args: unknown[]) => mockBuildingFindOne(...args),
  },
}));

vi.mock("@/modules/document-assets/services/document-asset-audit.service", () => ({
  recordDocumentAssetUploadRejected: (...args: unknown[]) => mockRecordUploadRejected(...args),
  recordDocumentAssetDownloaded: vi.fn(),
  recordDocumentAssetSoftDeleted: vi.fn(),
}));

vi.mock("@/shared/db/connect", () => ({
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/modules/document-assets/infra/document-asset.model", () => ({
  DocumentAsset: { find: vi.fn(), findOne: vi.fn() },
}));

function lawyerContext(): AuthenticatedContext {
  return {
    user: {
      id: "507f1f77bcf86cd799439011",
      email: "lawyer@example.com",
      fullName: "Lawyer",
      role: UserRole.LAWYER_ADMIN,
      accountStatus: AccountStatus.ACTIVE,
    },
    session: {} as AuthenticatedContext["session"],
  };
}

describe("document asset service — storage unavailable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAssertLawyerAdmin.mockImplementation(() => undefined);
    mockBuildingFindOne.mockReturnValue({
      lean: async () => ({ buildingId: BUILDING_ID }),
    });
    mockRecordUploadRejected.mockResolvedValue(undefined);
  });

  it("rejects upload initiation when storage is not configured", async () => {
    const { initiateDocumentAssetUpload } = await import(
      "@/modules/document-assets/services/document-asset.service"
    );

    await expect(
      initiateDocumentAssetUpload({
        context: lawyerContext(),
        payload: {
          buildingId: BUILDING_ID,
          classification: DocumentClassification.BANK_ACCOUNT_OWNERSHIP_PROOF,
          declaredMimeType: "application/pdf",
          originalFilename: "proof.pdf",
        },
      }),
    ).rejects.toMatchObject({ code: DocumentAssetErrorCode.STORAGE_NOT_CONFIGURED });

    expect(mockRecordUploadRejected).toHaveBeenCalledWith(
      expect.objectContaining({
        buildingId: BUILDING_ID,
        reasonCode: "storage_not_configured",
      }),
    );
  });

  it("reports storage_not_configured UI state", async () => {
    const { getDocumentStorageUiState } = await import(
      "@/modules/document-assets/services/document-asset.service"
    );
    expect(getDocumentStorageUiState()).toEqual({
      configured: false,
      state: "storage_not_configured",
    });
  });
});
