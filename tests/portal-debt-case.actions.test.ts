import { beforeEach, describe, expect, it, vi } from "vitest";

import { DebtCaseError, DebtCaseErrorCode } from "@/modules/debt-cases/domain/debt-case-errors";
import { DebtCaseWorkflowStatus } from "@/modules/debt-cases/domain/debt-case-workflow-status";
import { AccountStatus } from "@/modules/users/domain/account-status";
import { UserRole } from "@/modules/users/domain/user-role";

const mockRequireOperator = vi.fn();
const mockFindBuilding = vi.fn();
const mockCreateDraft = vi.fn();
const mockUpdate = vi.fn();
const mockSubmit = vi.fn();
const mockGetCase = vi.fn();

vi.mock("@/shared/security/request-origin", () => ({
  assertSameOriginMutationRequest: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/shared/auth/require-operator-portal", () => ({
  requireOperatorPortalAccess: (...args: unknown[]) => mockRequireOperator(...args),
}));

vi.mock("@/shared/auth/building-access/assert-building-access", () => ({
  findAccessibleBuildingByPublicId: (...args: unknown[]) => mockFindBuilding(...args),
}));

vi.mock("@/modules/debt-cases/services/debt-case.service", () => ({
  createDebtCaseDraft: (...args: unknown[]) => mockCreateDraft(...args),
  updateDebtCase: (...args: unknown[]) => mockUpdate(...args),
  submitDebtCaseForLawyerReview: (...args: unknown[]) => mockSubmit(...args),
  getDebtCase: (...args: unknown[]) => mockGetCase(...args),
  listDebtCasesForBuilding: vi.fn(),
  previewDebtCaseSubmissionFlags: vi.fn(),
}));

vi.mock("@/modules/audit/services/audit-correlation", () => ({
  resolveAuditCorrelationId: vi.fn().mockResolvedValue("corr-1"),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const BUILDING_A = "11111111-1111-4111-8111-111111111111";
const BUILDING_B = "22222222-2222-4222-8222-222222222222";
const CASE_ID = "33333333-3333-4333-8333-333333333333";

const operatorContext = {
  user: {
    id: "aaaaaaaaaaaaaaaaaaaaaaaa",
    email: "rep@test.com",
    role: UserRole.BUILDING_REP,
    accountStatus: AccountStatus.ACTIVE,
  },
};

describe("portal debt case actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireOperator.mockResolvedValue(operatorContext);
    mockFindBuilding.mockResolvedValue({ buildingId: BUILDING_A });
  });

  it("denies save when building is out of scope (IDOR)", async () => {
    mockFindBuilding.mockResolvedValue(null);
    const { saveDebtCaseDraftFormAction } = await import(
      "@/modules/debt-cases/actions/portal-debt-case.actions"
    );

    const formData = new FormData();
    formData.set("buildingId", BUILDING_B);
    formData.set("debtCaseId", CASE_ID);
    formData.set("revision", "0");

    const result = await saveDebtCaseDraftFormAction({ ok: false }, formData);
    expect(result.ok).toBe(false);
    expect(result.code).toBe(DebtCaseErrorCode.FORBIDDEN);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("creates draft through service for authorized building", async () => {
    mockCreateDraft.mockResolvedValue({
      debtCaseId: CASE_ID,
      buildingId: BUILDING_A,
      revision: 0,
      workflowStatus: DebtCaseWorkflowStatus.DRAFT,
    });

    const { createDebtCaseDraftFormAction } = await import(
      "@/modules/debt-cases/actions/portal-debt-case.actions"
    );

    const formData = new FormData();
    formData.set("buildingId", BUILDING_A);

    await expect(createDebtCaseDraftFormAction({ ok: false }, formData)).rejects.toThrow(/NEXT_REDIRECT/);
    expect(mockCreateDraft).toHaveBeenCalled();
  });

  it("returns revision conflict message from service error", async () => {
    mockUpdate.mockRejectedValue(new DebtCaseError(DebtCaseErrorCode.REVISION_CONFLICT, "stale"));

    const { saveDebtCaseDraftFormAction } = await import(
      "@/modules/debt-cases/actions/portal-debt-case.actions"
    );

    const formData = new FormData();
    formData.set("buildingId", BUILDING_A);
    formData.set("debtCaseId", CASE_ID);
    formData.set("revision", "1");
    formData.set("apartmentNumber", "12");

    const result = await saveDebtCaseDraftFormAction({ ok: false }, formData);
    expect(result.ok).toBe(false);
    expect(result.code).toBe(DebtCaseErrorCode.REVISION_CONFLICT);
  });

  it("maps duplicate overlap on submit", async () => {
    mockSubmit.mockRejectedValue(new DebtCaseError(DebtCaseErrorCode.DUPLICATE_OVERLAP, "overlap"));

    const { submitDebtCaseFormAction } = await import(
      "@/modules/debt-cases/actions/portal-debt-case.actions"
    );

    const formData = new FormData();
    formData.set("buildingId", BUILDING_A);
    formData.set("debtCaseId", CASE_ID);
    formData.set("revision", "0");
    formData.set("apartmentNumber", "12");
    formData.set("occupancyType", "owner");
    formData.set("legalDebtorDesignation", "property_owners");
    formData.set("propertyOwners.0.fullName", "Test");
    formData.set("propertyOwners.0.mobile", "0501234567");
    formData.set("debtType", "regular_vaad");
    formData.set("principalAmountNis", "100");
    formData.set("periodStartMonth", "2024-01");
    formData.set("periodEndMonth", "2024-02");

    const result = await submitDebtCaseFormAction({ ok: false }, formData);
    expect(result.ok).toBe(false);
    expect(result.code).toBe(DebtCaseErrorCode.DUPLICATE_OVERLAP);
  });
});
