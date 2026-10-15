import { beforeEach, describe, expect, it, vi } from "vitest";

import { DebtCaseLawyerReviewStatus } from "@/modules/debt-cases/domain/debt-case-lawyer-review-status";
import { DebtCaseWorkflowStatus } from "@/modules/debt-cases/domain/debt-case-workflow-status";
import { AccountStatus } from "@/modules/users/domain/account-status";
import { UserRole } from "@/modules/users/domain/user-role";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";

const mockListBuildings = vi.fn();
const mockGetBuildingIds = vi.fn();
const mockAggregate = vi.fn();
const mockFind = vi.fn();
const mockBuildingFind = vi.fn();

vi.mock("@/shared/db/connect", () => ({
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/shared/auth/building-access", () => ({
  listAccessibleBuildings: (...args: unknown[]) => mockListBuildings(...args),
  getAccessibleBuildingPublicIds: (...args: unknown[]) => mockGetBuildingIds(...args),
}));

vi.mock("@/modules/debt-cases/infra/debt-case.model", () => ({
  DebtCase: {
    aggregate: (...args: unknown[]) => mockAggregate(...args),
    find: (...args: unknown[]) => mockFind(...args),
  },
}));

vi.mock("@/modules/buildings/infra/building.model", () => ({
  Building: {
    find: (...args: unknown[]) => mockBuildingFind(...args),
  },
}));

const BUILDING_A = "11111111-1111-4111-8111-111111111111";
const BUILDING_B = "22222222-2222-4222-8222-222222222222";

const repContext: AuthenticatedContext = {
  user: {
    id: "rep-user",
    role: UserRole.BUILDING_REP,
    accountStatus: AccountStatus.ACTIVE,
    fullName: "Rep",
    email: "rep@test.com",
  },
} as AuthenticatedContext;

describe("operator portal dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListBuildings.mockResolvedValue([{ buildingId: BUILDING_A, displayName: "בניין א" }]);
    mockGetBuildingIds.mockResolvedValue([BUILDING_A]);
    mockAggregate.mockResolvedValue([
      {
        _id: BUILDING_A,
        totalDebtCases: 4,
        pendingLawyerReview: 1,
        returnedForCompletion: 2,
        approvedForLetterPrep: 1,
      },
    ]);
    mockBuildingFind.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([{ buildingId: BUILDING_A, address: { city: "תל אביב" } }]),
    });
    mockFind.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([
        {
          debtCaseId: "case-1",
          buildingId: BUILDING_A,
          apartmentNumberDisplay: "3",
          workflowStatus: DebtCaseWorkflowStatus.RETURNED_FOR_COMPLETION,
          lawyerReviewStatus: DebtCaseLawyerReviewStatus.RETURNED,
          updatedAt: new Date("2024-01-02"),
        },
      ]),
    });
  });

  it("scopes building rep dashboard to the assigned building", async () => {
    const { loadOperatorPortalDashboard } = await import(
      "@/modules/portal/services/operator-portal-dashboard.service"
    );
    const dashboard = await loadOperatorPortalDashboard(repContext);
    expect(dashboard.kind).toBe("building_rep");
    if (dashboard.kind === "building_rep") {
      expect(dashboard.building.buildingId).toBe(BUILDING_A);
      expect(dashboard.metrics.totalDebtCases).toBe(4);
      expect(dashboard.actionItems).toHaveLength(1);
    }
  });

  it("aggregates metrics across assigned buildings for management companies", async () => {
    mockListBuildings.mockResolvedValue([
      { buildingId: BUILDING_A, displayName: "א" },
      { buildingId: BUILDING_B, displayName: "ב" },
    ]);
    mockGetBuildingIds.mockResolvedValue([BUILDING_A, BUILDING_B]);
    mockAggregate.mockResolvedValue([
      {
        _id: BUILDING_A,
        totalDebtCases: 2,
        pendingLawyerReview: 1,
        returnedForCompletion: 0,
        approvedForLetterPrep: 1,
      },
      {
        _id: BUILDING_B,
        totalDebtCases: 3,
        pendingLawyerReview: 0,
        returnedForCompletion: 1,
        approvedForLetterPrep: 2,
      },
    ]);
    mockBuildingFind.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    });

    const mcContext = {
      user: {
        ...repContext.user,
        role: UserRole.MANAGEMENT_COMPANY,
      },
    } as AuthenticatedContext;

    const { loadOperatorPortalDashboard } = await import(
      "@/modules/portal/services/operator-portal-dashboard.service"
    );
    const dashboard = await loadOperatorPortalDashboard(mcContext);
    expect(dashboard.kind).toBe("management_company");
    if (dashboard.kind === "management_company") {
      expect(dashboard.assignedBuildingCount).toBe(2);
      expect(dashboard.aggregateMetrics.totalDebtCases).toBe(5);
    }
  });
});

describe("portal platform modules", () => {
  it("marks future modules as coming soon", async () => {
    const { getPortalPlatformModules } = await import(
      "@/modules/portal/presentation/portal-platform-modules"
    );
    const modules = getPortalPlatformModules({ role: UserRole.BUILDING_REP });
    const payments = modules.find((module) => module.id === "payments");
    expect(payments?.status).toBe("coming_soon");
    expect(payments?.href).toBeUndefined();
  });
});
