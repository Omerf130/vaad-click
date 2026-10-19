import { beforeEach, describe, expect, it, vi } from "vitest";

import { UserRole } from "@/modules/users/domain/user-role";
import { AccountStatus } from "@/modules/users/domain/account-status";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";

const mockGetAccessible = vi.fn();
const mockBuildingFind = vi.fn();
const mockCompanyFindOne = vi.fn();

vi.mock("@/shared/db/connect", () => ({
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/shared/auth/building-access", () => ({
  getAccessibleBuildingPublicIds: (...args: unknown[]) => mockGetAccessible(...args),
  listAccessibleBuildings: vi.fn(),
}));

vi.mock("@/modules/buildings/infra/building.model", () => ({
  Building: {
    find: (...args: unknown[]) => mockBuildingFind(...args),
  },
}));

vi.mock("@/modules/management-companies/infra/management-company.model", () => ({
  ManagementCompany: {
    findOne: (...args: unknown[]) => mockCompanyFindOne(...args),
  },
}));

const repContext: AuthenticatedContext = {
  user: {
    id: "507f1f77bcf86cd799439011",
    role: UserRole.BUILDING_REP,
    accountStatus: AccountStatus.ACTIVE,
    fullName: "Rep",
    email: "rep@test.com",
  },
} as AuthenticatedContext;

describe("report scope", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBuildingFind.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([{ buildingId: "b-1" }, { buildingId: "b-2" }]),
    });
  });

  it("denies building filter outside operator access", async () => {
    mockGetAccessible.mockResolvedValue(["b-1"]);
    const { resolveReportScope, ReportAccessError } = await import(
      "@/modules/reports/services/report-scope.service"
    );
    await expect(
      resolveReportScope({
        context: repContext,
        requestedBuildingId: "b-2",
      }),
    ).rejects.toBeInstanceOf(ReportAccessError);
  });

  it("allows lawyer admin global scope", async () => {
    const lawyer = {
      ...repContext,
      user: { ...repContext.user, role: UserRole.LAWYER_ADMIN },
    } as AuthenticatedContext;
    const { resolveReportScope } = await import("@/modules/reports/services/report-scope.service");
    const scope = await resolveReportScope({ context: lawyer });
    expect(scope.kind).toBe("lawyer_admin");
    expect(scope.buildingIds).toEqual(["b-1", "b-2"]);
  });
});
