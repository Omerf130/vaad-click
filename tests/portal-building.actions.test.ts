import { beforeEach, describe, expect, it, vi } from "vitest";

import { OrganizationErrorCode } from "@/modules/buildings/domain/organization-errors";
import { AccountStatus } from "@/modules/users/domain/account-status";
import { UserRole } from "@/modules/users/domain/user-role";

const mockRequireOperator = vi.fn();
const mockCreateBuilding = vi.fn();
const mockSameOrigin = vi.fn();
const mockCorrelation = vi.fn();

vi.mock("@/shared/auth/require-operator-portal", () => ({
  requireOperatorPortalAccess: (...args: unknown[]) => mockRequireOperator(...args),
}));

vi.mock("@/shared/security/request-origin", () => ({
  assertSameOriginMutationRequest: (...args: unknown[]) => mockSameOrigin(...args),
}));

vi.mock("@/modules/buildings/services/management-company-building.service", () => ({
  createBuildingForManagementCompany: (...args: unknown[]) => mockCreateBuilding(...args),
}));

vi.mock("@/modules/audit/services/audit-correlation", () => ({
  resolveAuditCorrelationId: (...args: unknown[]) => mockCorrelation(...args),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

function formData() {
  const fd = new FormData();
  fd.set("displayName", "בניין בדיקה");
  fd.set("city", "חיפה");
  fd.set("street", "הנביאים");
  fd.set("houseNumber", "5");
  return fd;
}

describe("managementCompanyCreateBuildingFormAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSameOrigin.mockResolvedValue(undefined);
    mockCorrelation.mockResolvedValue("corr-1");
    mockRequireOperator.mockResolvedValue({
      user: { role: UserRole.MANAGEMENT_COMPANY, accountStatus: AccountStatus.ACTIVE },
    });
    mockCreateBuilding.mockResolvedValue({ buildingId: "11111111-1111-4111-8111-111111111111" });
  });

  it("creates building for approved management company", async () => {
    const { managementCompanyCreateBuildingFormAction } = await import(
      "@/modules/buildings/actions/portal-building.actions"
    );
    const result = await managementCompanyCreateBuildingFormAction({ ok: false }, formData());
    expect(result.ok).toBe(true);
    expect(result.buildingId).toBeTruthy();
    expect(mockCreateBuilding).toHaveBeenCalled();
  });

  it("rejects building rep", async () => {
    mockRequireOperator.mockResolvedValue({
      user: { role: UserRole.BUILDING_REP, accountStatus: AccountStatus.ACTIVE },
    });
    const { managementCompanyCreateBuildingFormAction } = await import(
      "@/modules/buildings/actions/portal-building.actions"
    );
    const result = await managementCompanyCreateBuildingFormAction({ ok: false }, formData());
    expect(result.ok).toBe(false);
    expect(result.code).toBe(OrganizationErrorCode.FORBIDDEN);
    expect(mockCreateBuilding).not.toHaveBeenCalled();
  });
});
