import { beforeEach, describe, expect, it, vi } from "vitest";

import { DebtCaseDebtType } from "@/modules/debt-cases/domain/debt-case-debt-type";
import { DebtCaseOccupancyType } from "@/modules/debt-cases/domain/debt-case-occupancy-type";
import { LegalDebtorDesignation } from "@/modules/debt-cases/domain/debt-case-parties";
import { parseDebtCaseFormDataToSubmitPayload } from "@/modules/debt-cases/validation/debt-case-form.parser";
import { AccountStatus } from "@/modules/users/domain/account-status";
import { UserRole } from "@/modules/users/domain/user-role";

const mockRequireOperator = vi.fn();
const mockFindBuilding = vi.fn();
const mockPreview = vi.fn();

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
  createDebtCaseDraft: vi.fn(),
  updateDebtCase: vi.fn(),
  submitDebtCaseForLawyerReview: vi.fn(),
  getDebtCase: vi.fn(),
  listDebtCasesForBuilding: vi.fn(),
  previewDebtCaseSubmissionFlags: (...args: unknown[]) => mockPreview(...args),
}));

const BUILDING_A = "11111111-1111-4111-8111-111111111111";
const CASE_ID = "33333333-3333-4333-8333-333333333333";

const operatorContext = {
  user: {
    id: "aaaaaaaaaaaaaaaaaaaaaaaa",
    email: "rep@test.com",
    role: UserRole.BUILDING_REP,
    accountStatus: AccountStatus.ACTIVE,
  },
};

function buildValidOwnerOccupiedFormData(overrides?: (formData: FormData) => void): FormData {
  const formData = new FormData();
  formData.set("buildingId", BUILDING_A);
  formData.set("debtCaseId", CASE_ID);
  formData.set("revision", "0");
  formData.set("apartmentNumber", "12");
  formData.set("propertyOwners.0.fullName", "ישראל ישראלי");
  formData.set("propertyOwners.0.mobile", "0501234567");
  formData.set("occupancyType", DebtCaseOccupancyType.OWNER);
  formData.set("legalDebtorDesignation", LegalDebtorDesignation.PROPERTY_OWNERS);
  formData.set("debtType", DebtCaseDebtType.REGULAR_VAAD);
  formData.set("principalAmountNis", "500");
  formData.set("periodStartMonth", "2024-01");
  formData.set("periodEndMonth", "2024-06");
  overrides?.(formData);
  return formData;
}

describe("preview debt case submission validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireOperator.mockResolvedValue(operatorContext);
    mockFindBuilding.mockResolvedValue({ buildingId: BUILDING_A });
    mockPreview.mockResolvedValue({ blocking: false, flags: [] });
  });

  it("returns apartment field error for missing mandatory apartment number", async () => {
    const { previewDebtCaseSubmitFormAction } = await import(
      "@/modules/debt-cases/actions/portal-debt-case.actions"
    );
    const formData = buildValidOwnerOccupiedFormData((fd) => fd.set("apartmentNumber", ""));

    const result = await previewDebtCaseSubmitFormAction({ ok: false }, formData);

    expect(result.ok).toBe(false);
    expect(result.fieldErrors?.apartmentNumber).toBe("נדרש מספר דירה");
    expect(result.message).toBe("נדרש מספר דירה");
    expect(mockPreview).not.toHaveBeenCalled();
  });

  it("returns Hebrew mobile error on invalid owner mobile", async () => {
    const { previewDebtCaseSubmitFormAction } = await import(
      "@/modules/debt-cases/actions/portal-debt-case.actions"
    );
    const formData = buildValidOwnerOccupiedFormData((fd) =>
      fd.set("propertyOwners.0.mobile", "123"),
    );

    const result = await previewDebtCaseSubmitFormAction({ ok: false }, formData);

    expect(result.ok).toBe(false);
    expect(result.fieldErrors?.["propertyOwners.0.mobile"]).toBe("מספר נייד לא תקין");
    expect(mockPreview).not.toHaveBeenCalled();
  });

  it("returns period format error for invalid debt period", async () => {
    const { previewDebtCaseSubmitFormAction } = await import(
      "@/modules/debt-cases/actions/portal-debt-case.actions"
    );
    const formData = buildValidOwnerOccupiedFormData((fd) => fd.set("periodStartMonth", "2024-13"));

    const result = await previewDebtCaseSubmitFormAction({ ok: false }, formData);

    expect(result.ok).toBe(false);
    expect(result.fieldErrors?.periodStartMonth).toBe("תקופה חייבת להיות בפורמט YYYY-MM");
    expect(mockPreview).not.toHaveBeenCalled();
  });

  it("returns owner contact error when tenant-occupied without owner mobile", async () => {
    const { previewDebtCaseSubmitFormAction } = await import(
      "@/modules/debt-cases/actions/portal-debt-case.actions"
    );
    const formData = buildValidOwnerOccupiedFormData((fd) => {
      fd.set("occupancyType", DebtCaseOccupancyType.TENANT);
      fd.set("legalDebtorDesignation", LegalDebtorDesignation.TENANT);
      fd.set("propertyOwners.0.mobile", "");
      fd.set("tenant.fullName", "דוד שוכר");
      fd.set("tenant.mobile", "0507654321");
    });

    const result = await previewDebtCaseSubmitFormAction({ ok: false }, formData);

    expect(result.ok).toBe(false);
    expect(result.fieldErrors?.propertyOwners).toBe(
      "נדרש נייד לפחות לבעל דירה אחד (למען המכתב)",
    );
    expect(mockPreview).not.toHaveBeenCalled();
  });

  it("returns nested property owner name error in Hebrew", async () => {
    const { previewDebtCaseSubmitFormAction } = await import(
      "@/modules/debt-cases/actions/portal-debt-case.actions"
    );
    const formData = buildValidOwnerOccupiedFormData((fd) => {
      fd.set("propertyOwners.0.fullName", "");
      fd.set("propertyOwners.0.mobile", "");
    });

    const result = await previewDebtCaseSubmitFormAction({ ok: false }, formData);

    expect(result.ok).toBe(false);
    expect(result.fieldErrors?.propertyOwners).toMatch(/בעלים/);
    expect(mockPreview).not.toHaveBeenCalled();
  });

  it("preserves parsed form values after validation failure", async () => {
    const { previewDebtCaseSubmitFormAction } = await import(
      "@/modules/debt-cases/actions/portal-debt-case.actions"
    );
    const formData = buildValidOwnerOccupiedFormData((fd) => fd.set("apartmentNumber", ""));

    const before = parseDebtCaseFormDataToSubmitPayload({ formData, buildingId: BUILDING_A });
    await previewDebtCaseSubmitFormAction({ ok: false }, formData);
    const after = parseDebtCaseFormDataToSubmitPayload({ formData, buildingId: BUILDING_A });

    expect(after.apartmentNumber).toBe(before.apartmentNumber);
    expect(after.propertyOwners?.[0]?.fullName).toBe(before.propertyOwners?.[0]?.fullName);
    expect(after.principalAmountMinor).toBe(before.principalAmountMinor);
  });

  it("calls preview service with valid data and returns success message", async () => {
    const { previewDebtCaseSubmitFormAction } = await import(
      "@/modules/debt-cases/actions/portal-debt-case.actions"
    );
    const formData = buildValidOwnerOccupiedFormData();

    const result = await previewDebtCaseSubmitFormAction({ ok: false }, formData);

    expect(result.ok).toBe(true);
    expect(result.message).toBe("הנתונים תקינים להגשה.");
    expect(mockPreview).toHaveBeenCalledOnce();
    expect(mockPreview.mock.calls[0]?.[0]).toMatchObject({
      debtCaseId: CASE_ID,
    });
  });

  it("returns lastIntent preview from operator form action wrapper", async () => {
    const { debtCaseOperatorFormAction } = await import(
      "@/modules/debt-cases/actions/portal-debt-case.actions"
    );
    const formData = buildValidOwnerOccupiedFormData();
    formData.set("intent", "preview");

    const result = await debtCaseOperatorFormAction({ ok: false }, formData);
    expect(result.lastIntent).toBe("preview");
    expect(result.ok).toBe(true);
  });
});
