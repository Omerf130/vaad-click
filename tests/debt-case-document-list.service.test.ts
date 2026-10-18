import { beforeEach, describe, expect, it, vi } from "vitest";

import { DocumentClassification } from "@/modules/document-assets/domain/document-classification";
import { DocumentAssetStatus } from "@/modules/document-assets/domain/document-asset-status";
import { DocumentOwnerEntityType } from "@/modules/document-assets/domain/document-owner-entity-type";
import {
  DocumentAssetError,
  DocumentAssetErrorCode,
} from "@/modules/document-assets/domain/document-asset-errors";
import { AccountStatus } from "@/modules/users/domain/account-status";
import { UserRole } from "@/modules/users/domain/user-role";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";

const BUILDING_A = "11111111-1111-4111-8111-111111111111";
const CASE_ID = "debt-case-docs-1";

const mockGetDebtCase = vi.fn();
const mockDocumentFind = vi.fn();
const mockAuthorize = vi.fn();
const mockAssertLawyerAdmin = vi.fn();
const mockBuildingFindOne = vi.fn();

vi.mock("@/shared/db/connect", () => ({
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/modules/debt-cases/services/debt-case.service", () => ({
  getDebtCase: (...args: unknown[]) => mockGetDebtCase(...args),
}));

vi.mock("@/modules/document-assets/infra/document-asset.model", () => ({
  DocumentAsset: {
    find: (...args: unknown[]) => mockDocumentFind(...args),
  },
}));

vi.mock("@/modules/document-assets/services/document-asset-authorization.service", () => ({
  authorizeDocumentAssetAccess: (...args: unknown[]) => mockAuthorize(...args),
  DocumentAssetAccessIntent: { LIST: "list" },
}));

vi.mock("@/modules/organizations/services/assert-lawyer-admin", () => ({
  assertLawyerAdminOrganization: (...args: unknown[]) => mockAssertLawyerAdmin(...args),
}));

vi.mock("@/modules/buildings/infra/building.model", () => ({
  Building: {
    findOne: (...args: unknown[]) => mockBuildingFindOne(...args),
  },
}));

function operatorContext(): AuthenticatedContext {
  return {
    user: {
      id: "rep",
      role: UserRole.BUILDING_REP,
      accountStatus: AccountStatus.ACTIVE,
      fullName: "Rep",
      email: "rep@test.com",
    },
  } as AuthenticatedContext;
}

function lawyerContext(): AuthenticatedContext {
  return {
    user: {
      id: "lawyer",
      role: UserRole.LAWYER_ADMIN,
      accountStatus: AccountStatus.ACTIVE,
      fullName: "Lawyer",
      email: "lawyer@test.com",
    },
  } as AuthenticatedContext;
}

describe("debt case document list", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDebtCase.mockResolvedValue({ debtCaseId: CASE_ID, buildingId: BUILDING_A });
    mockBuildingFindOne.mockReturnValue({
      lean: vi.fn().mockResolvedValue({ buildingId: BUILDING_A }),
    });
    mockDocumentFind.mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([
        {
          documentAssetId: "doc-visible",
          classification: DocumentClassification.DEBT_CASE_ATTACHMENT,
          status: DocumentAssetStatus.ACTIVE,
          createdAt: new Date("2024-06-01T10:00:00Z"),
          originalFilename: "contract.pdf",
          byteSize: 2048,
          buildingId: BUILDING_A,
          ownerEntityType: DocumentOwnerEntityType.DEBT_CASE,
          ownerEntityId: CASE_ID,
        },
        {
          documentAssetId: "doc-hidden",
          classification: DocumentClassification.GENERATED_WARNING_LETTER,
          status: DocumentAssetStatus.ACTIVE,
          createdAt: new Date("2024-06-02T10:00:00Z"),
          originalFilename: "letter.pdf",
          byteSize: 4096,
          buildingId: BUILDING_A,
          ownerEntityType: DocumentOwnerEntityType.DEBT_CASE,
          ownerEntityId: CASE_ID,
        },
      ]),
    });
  });

  it("lists only operator-authorized debt case documents without leaking denied rows", async () => {
    mockAuthorize.mockImplementation(async ({ document }: { document: { documentAssetId: string } }) => {
      if (document.documentAssetId === "doc-hidden") {
        throw new DocumentAssetError(DocumentAssetErrorCode.FORBIDDEN, "forbidden");
      }
    });

    const { listDebtCaseDocumentAssetsForCasePortal } = await import(
      "@/modules/document-assets/services/document-asset.service"
    );

    const items = await listDebtCaseDocumentAssetsForCasePortal({
      context: operatorContext(),
      debtCaseId: CASE_ID,
    });

    expect(items).toHaveLength(1);
    expect(items[0]?.displayName).toBe("contract.pdf");
    expect(items[0]?.classification).toBe(DocumentClassification.DEBT_CASE_ATTACHMENT);
    expect(mockGetDebtCase).toHaveBeenCalledWith(
      expect.objectContaining({ debtCaseId: CASE_ID }),
    );
  });

  it("lists all debt case documents for lawyer admin review", async () => {
    const { listDebtCaseDocumentAssetsForLawyerAdmin } = await import(
      "@/modules/document-assets/services/document-asset.service"
    );

    const items = await listDebtCaseDocumentAssetsForLawyerAdmin({
      context: lawyerContext(),
      debtCaseId: CASE_ID,
      buildingId: BUILDING_A,
    });

    expect(items).toHaveLength(2);
    expect(items.map((row) => row.documentAssetId)).toEqual(["doc-visible", "doc-hidden"]);
    expect(mockAssertLawyerAdmin).toHaveBeenCalled();
  });
});
