import { beforeEach, describe, expect, it, vi } from "vitest";

import { NotificationEntityType } from "@/modules/notifications/domain/notification-event-type";
import { AccountStatus } from "@/modules/users/domain/account-status";
import { UserRole } from "@/modules/users/domain/user-role";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";

const mockDebtCaseFind = vi.fn();
const mockBuildingFind = vi.fn();
const mockAccessibleBuildings = vi.fn();

vi.mock("@/shared/db/connect", () => ({
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/modules/debt-cases/infra/debt-case.model", () => ({
  DebtCase: { findOne: (...args: unknown[]) => mockDebtCaseFind(...args) },
}));

vi.mock("@/modules/buildings/infra/building.model", () => ({
  Building: { findOne: (...args: unknown[]) => mockBuildingFind(...args) },
}));

vi.mock("@/shared/auth/building-access", () => ({
  getAccessibleBuildingPublicIds: (...args: unknown[]) => mockAccessibleBuildings(...args),
}));

function operatorContext(): AuthenticatedContext {
  return {
    user: {
      id: "507f1f77bcf86cd799439011",
      role: UserRole.BUILDING_REP,
      accountStatus: AccountStatus.ACTIVE,
      fullName: "Rep",
      email: "rep@test.com",
    },
  } as AuthenticatedContext;
}

describe("notification destination resolution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAccessibleBuildings.mockResolvedValue(["building-1"]);
    mockDebtCaseFind.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue({ buildingId: "building-1" }),
    });
  });

  it("routes operator to authorized debt case path", async () => {
    const { assertCanAccessNotificationDestination } = await import(
      "@/modules/notifications/services/notification-destination.service"
    );
    const path = await assertCanAccessNotificationDestination({
      context: operatorContext(),
      entityType: NotificationEntityType.DEBT_CASE,
      entityId: "case-1",
      fallbackPath: "/app/admin/debt-cases/case-1",
    });
    expect(path).toBe("/app/buildings/building-1/debt-cases/case-1");
  });

  it("falls back when building access denied", async () => {
    mockAccessibleBuildings.mockResolvedValue([]);
    const { assertCanAccessNotificationDestination } = await import(
      "@/modules/notifications/services/notification-destination.service"
    );
    const path = await assertCanAccessNotificationDestination({
      context: operatorContext(),
      entityType: NotificationEntityType.DEBT_CASE,
      entityId: "case-1",
      fallbackPath: "/app/buildings/building-1/debt-cases/case-1",
    });
    expect(path).toBe("/app");
  });
});
