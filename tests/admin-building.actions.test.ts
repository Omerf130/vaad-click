import { beforeEach, describe, expect, it, vi } from "vitest";

import { OrganizationError, OrganizationErrorCode } from "@/modules/buildings/domain/organization-errors";

const mockSameOrigin = vi.fn();
const mockLawyer = vi.fn();
const mockCreate = vi.fn();
const mockAssign = vi.fn();
const mockLink = vi.fn();
const mockRevalidate = vi.fn();

vi.mock("@/shared/security/request-origin", () => ({
  assertSameOriginMutationRequest: (...args: unknown[]) => mockSameOrigin(...args),
}));

vi.mock("@/shared/auth/require-access", () => ({
  requireLawyerAdminPortal: (...args: unknown[]) => mockLawyer(...args),
}));

vi.mock("@/modules/buildings/services/building-lifecycle.service", () => ({
  createBuildingRecord: (...args: unknown[]) => mockCreate(...args),
  updateBuildingRecord: vi.fn(),
  archiveBuildingRecord: vi.fn(),
}));

vi.mock("@/modules/buildings/services/building-assignment.service", () => ({
  assignBuildingRepresentative: (...args: unknown[]) => mockAssign(...args),
  clearBuildingRepresentative: vi.fn(),
  linkBuildingToManagementCompany: (...args: unknown[]) => mockLink(...args),
  unlinkBuildingFromManagementCompany: vi.fn(),
}));

vi.mock("@/modules/audit/services/audit-correlation", () => ({
  resolveAuditCorrelationId: vi.fn().mockResolvedValue("c1"),
}));

vi.mock("next/cache", () => ({ revalidatePath: (...args: unknown[]) => mockRevalidate(...args) }));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    const error = new Error("NEXT_REDIRECT") as Error & { digest: string };
    error.digest = `NEXT_REDIRECT;${url}`;
    throw error;
  }),
}));

describe("admin building actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSameOrigin.mockResolvedValue(undefined);
    mockLawyer.mockResolvedValue({ user: { id: "lawyer" } });
  });

  it("requires same-origin and lawyer admin for create", async () => {
    mockCreate.mockResolvedValue({ buildingId: "11111111-1111-4111-8111-111111111111" });
    const { createBuildingFormAction } = await import(
      "@/modules/buildings/actions/admin-building.actions"
    );
    const fd = new FormData();
    fd.set("displayName", "Test");
    fd.set("city", "Tel Aviv");
    fd.set("street", "Herzl");
    fd.set("houseNumber", "1");

    await expect(createBuildingFormAction({ ok: false }, fd)).rejects.toThrow(/NEXT_REDIRECT/);
    expect(mockCreate).toHaveBeenCalled();
  });

  it("maps organization errors from management company link", async () => {
    mockLink.mockRejectedValue(
      new OrganizationError(
        OrganizationErrorCode.MANAGEMENT_COMPANY_INACTIVE,
        "Management company is not active",
      ),
    );

    const { linkManagementCompanyFormAction } = await import(
      "@/modules/buildings/actions/admin-building.actions"
    );
    const fd = new FormData();
    fd.set("buildingId", "11111111-1111-4111-8111-111111111111");
    fd.set("managementCompanyId", "22222222-2222-4222-8222-222222222222");

    const result = await linkManagementCompanyFormAction({ ok: false }, fd);
    expect(result.ok).toBe(false);
    expect(result.message).toContain("אינה פעילה");
  });

  it("revalidates building and company detail paths after link", async () => {
    mockLink.mockResolvedValue(undefined);
    const buildingId = "11111111-1111-4111-8111-111111111111";
    const managementCompanyId = "22222222-2222-4222-8222-222222222222";

    const { linkManagementCompanyFormAction } = await import(
      "@/modules/buildings/actions/admin-building.actions"
    );
    const fd = new FormData();
    fd.set("buildingId", buildingId);
    fd.set("managementCompanyId", managementCompanyId);

    const result = await linkManagementCompanyFormAction({ ok: false }, fd);
    expect(result.ok).toBe(true);
    expect(mockRevalidate).toHaveBeenCalledWith(
      `/app/admin/management-companies/${managementCompanyId}`,
    );
  });
});
