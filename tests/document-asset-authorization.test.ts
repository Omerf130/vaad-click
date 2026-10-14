import { beforeEach, describe, expect, it, vi } from "vitest";

import { DocumentClassification } from "@/modules/document-assets/domain/document-classification";
import {
  DocumentAssetError,
  DocumentAssetErrorCode,
} from "@/modules/document-assets/domain/document-asset-errors";
import { DocumentAssetStatus } from "@/modules/document-assets/domain/document-asset-status";
import { defaultAccessPolicyForClassification } from "@/modules/document-assets/domain/document-access-policy";
import {
  authorizeDocumentAssetAccess,
  assertDocumentReadableByStatus,
  DocumentAssetAccessIntent,
} from "@/modules/document-assets/services/document-asset-authorization.service";
import { AccountStatus } from "@/modules/users/domain/account-status";
import { UserRole } from "@/modules/users/domain/user-role";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import { BuildingScopeMode } from "@/shared/auth/building-access/building-access-scope.types";

const BUILDING_A = "11111111-1111-4111-8111-111111111111";

const mockAssertBuildingAccess = vi.fn();

vi.mock("@/shared/auth/building-access/assert-building-access", () => ({
  assertBuildingAccess: (...args: unknown[]) => mockAssertBuildingAccess(...args),
}));

function context(role: UserRole): AuthenticatedContext {
  return {
    user: {
      id: "507f1f77bcf86cd799439011",
      email: "u@example.com",
      fullName: "User",
      role,
      accountStatus: AccountStatus.ACTIVE,
    },
    session: {} as AuthenticatedContext["session"],
  };
}

function documentSubject(classification: DocumentClassification) {
  return {
    buildingId: BUILDING_A,
    classification,
    status: DocumentAssetStatus.ACTIVE,
    accessPolicy: defaultAccessPolicyForClassification(classification),
    deletedAt: null,
  };
}

describe("document asset authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAssertBuildingAccess.mockResolvedValue({
      scope: {
        mode: BuildingScopeMode.ASSIGNED,
        buildingIds: [BUILDING_A],
        accountStatus: AccountStatus.ACTIVE,
      },
    });
  });

  it("allows lawyer-admin in building admin workflow for bank documents", async () => {
    await expect(
      authorizeDocumentAssetAccess({
        context: context(UserRole.LAWYER_ADMIN),
        document: documentSubject(DocumentClassification.BANK_ACCOUNT_OWNERSHIP_PROOF),
        intent: DocumentAssetAccessIntent.READ,
        lawyerAdminBuildingWorkflow: true,
      }),
    ).resolves.toBeUndefined();
  });

  it("allows lawyer-admin with global scope without building workflow flag", async () => {
    mockAssertBuildingAccess.mockResolvedValue({
      scope: {
        mode: BuildingScopeMode.GLOBAL,
        buildingIds: [],
        accountStatus: AccountStatus.ACTIVE,
      },
    });

    await expect(
      authorizeDocumentAssetAccess({
        context: context(UserRole.LAWYER_ADMIN),
        document: documentSubject(DocumentClassification.BANK_ACCOUNT_OWNERSHIP_PROOF),
        intent: DocumentAssetAccessIntent.READ,
        lawyerAdminBuildingWorkflow: false,
      }),
    ).resolves.toBeUndefined();
  });

  it("denies management company read on bank ownership proof", async () => {
    await expect(
      authorizeDocumentAssetAccess({
        context: context(UserRole.MANAGEMENT_COMPANY),
        document: documentSubject(DocumentClassification.BANK_ACCOUNT_OWNERSHIP_PROOF),
        intent: DocumentAssetAccessIntent.READ,
      }),
    ).rejects.toMatchObject({ code: DocumentAssetErrorCode.FORBIDDEN });
  });

  it("denies building representative read on committee authorization in CP7", async () => {
    await expect(
      authorizeDocumentAssetAccess({
        context: context(UserRole.BUILDING_REP),
        document: documentSubject(DocumentClassification.BUILDING_COMMITTEE_AUTHORIZATION),
        intent: DocumentAssetAccessIntent.LIST,
      }),
    ).rejects.toMatchObject({ code: DocumentAssetErrorCode.FORBIDDEN });
  });

  it("denies management company upload even when assigned to building", async () => {
    await expect(
      authorizeDocumentAssetAccess({
        context: context(UserRole.MANAGEMENT_COMPANY),
        document: documentSubject(DocumentClassification.BUILDING_COMMITTEE_AUTHORIZATION),
        intent: DocumentAssetAccessIntent.UPLOAD,
      }),
    ).rejects.toMatchObject({ code: DocumentAssetErrorCode.FORBIDDEN });
  });

  it("treats soft-deleted documents as not found", async () => {
    await expect(
      authorizeDocumentAssetAccess({
        context: context(UserRole.LAWYER_ADMIN),
        document: {
          ...documentSubject(DocumentClassification.BUILDING_COMMITTEE_AUTHORIZATION),
          deletedAt: new Date(),
        },
        intent: DocumentAssetAccessIntent.READ,
        lawyerAdminBuildingWorkflow: true,
      }),
    ).rejects.toMatchObject({ code: DocumentAssetErrorCode.NOT_FOUND });
  });

  it("blocks download for non-active statuses", () => {
    expect(() => assertDocumentReadableByStatus(DocumentAssetStatus.PENDING_SCAN)).toThrow(
      DocumentAssetError,
    );
    expect(() => assertDocumentReadableByStatus(DocumentAssetStatus.QUARANTINED)).toThrow(
      DocumentAssetError,
    );
    expect(() => assertDocumentReadableByStatus(DocumentAssetStatus.ACTIVE)).not.toThrow();
  });
});
