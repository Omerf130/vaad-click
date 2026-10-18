import { beforeEach, describe, expect, it, vi } from "vitest";

import { UserRole } from "@/modules/users/domain/user-role";
import { AccountStatus } from "@/modules/users/domain/account-status";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import { OrganizationErrorCode } from "@/modules/buildings/domain/organization-errors";

const mockDebtCount = vi.fn();
const mockBuildingCount = vi.fn();
const mockUserFind = vi.fn();
const mockDebtFind = vi.fn();
const mockBuildingFind = vi.fn();

vi.mock("@/modules/debt-cases/infra/debt-case.model", () => ({
  DebtCase: {
    countDocuments: (...args: unknown[]) => mockDebtCount(...args),
    find: (...args: unknown[]) => mockDebtFind(...args),
  },
}));

vi.mock("@/modules/buildings/infra/building.model", () => ({
  Building: {
    countDocuments: (...args: unknown[]) => mockBuildingCount(...args),
    find: (...args: unknown[]) => mockBuildingFind(...args),
  },
}));

vi.mock("@/modules/users/infra/user.model", () => ({
  User: {
    find: (...args: unknown[]) => mockUserFind(...args),
  },
}));

vi.mock("@/shared/db/connect", () => ({
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

const lawyerContext: AuthenticatedContext = {
  user: {
    id: "lawyer",
    role: UserRole.LAWYER_ADMIN,
    accountStatus: AccountStatus.ACTIVE,
    fullName: "Lawyer",
    email: "lawyer@test.com",
  },
} as AuthenticatedContext;

describe("admin dashboard queues", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDebtCount.mockResolvedValue(3);
    mockBuildingCount.mockResolvedValue(5);
    mockUserFind.mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    });
    mockDebtFind.mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    });
    mockBuildingFind.mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    });
  });

  it("returns operational counts for lawyer admin", async () => {
    const { getAdminOperationalCounts } = await import(
      "@/modules/admin/services/admin-dashboard-queues.service"
    );
    const counts = await getAdminOperationalCounts(lawyerContext);
    expect(counts.debtCasesAwaitingReview).toBe(3);
    expect(counts.buildingsPendingVerification).toBe(5);
  });

  it("rejects non-lawyer for operational counts", async () => {
    const { getAdminOperationalCounts } = await import(
      "@/modules/admin/services/admin-dashboard-queues.service"
    );
    await expect(
      getAdminOperationalCounts({
        ...lawyerContext,
        user: { ...lawyerContext.user, role: UserRole.BUILDING_REP },
      }),
    ).rejects.toMatchObject({ code: OrganizationErrorCode.FORBIDDEN });
  });
});
