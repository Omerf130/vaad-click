import { beforeEach, describe, expect, it, vi } from "vitest";

import { AccountStatus } from "@/modules/users/domain/account-status";
import { ClientApprovalStatus } from "@/modules/users/domain/client-approval-status";
import { UserRole } from "@/modules/users/domain/user-role";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";

vi.mock("@/shared/db/connect", () => ({
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

const mockBuildingFindOne = vi.fn();
const mockBuildingCountDocuments = vi.fn();

vi.mock("@/modules/buildings/infra/building.model", () => ({
  Building: {
    findOne: (...args: unknown[]) => mockBuildingFindOne(...args),
    countDocuments: (...args: unknown[]) => mockBuildingCountDocuments(...args),
    create: vi.fn(),
  },
}));

const mockAssertBuildingAccess = vi.fn();

vi.mock("@/shared/auth/building-access/assert-building-access", () => ({
  assertBuildingAccess: (...args: unknown[]) => mockAssertBuildingAccess(...args),
}));

function repContext(): AuthenticatedContext {
  return {
    user: {
      id: "507f1f77bcf86cd799439011",
      email: "rep@test.com",
      fullName: "Rep",
      role: UserRole.BUILDING_REP,
      accountStatus: AccountStatus.ACTIVE,
      clientApprovalStatus: ClientApprovalStatus.AWAITING_SUBMISSION,
    },
    session: {} as AuthenticatedContext["session"],
  };
}

describe("detectIntakeAddressCollision", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns no collision when no building exists at address", async () => {
    mockBuildingFindOne.mockReturnValue({ lean: vi.fn().mockResolvedValue(null) });
    const { detectIntakeAddressCollision } = await import(
      "@/modules/debt-cases/services/debt-case-intake-building-resolver.service"
    );
    const result = await detectIntakeAddressCollision({
      context: repContext(),
      normalizedAddressKey: "key-1",
    });
    expect(result).toEqual({ collision: false });
  });

  it("returns collision when building exists but user has no access", async () => {
    mockBuildingFindOne.mockReturnValue({
      lean: vi.fn().mockResolvedValue({ buildingId: "b-existing" }),
    });
    mockAssertBuildingAccess.mockRejectedValue(new Error("denied"));
    const { detectIntakeAddressCollision } = await import(
      "@/modules/debt-cases/services/debt-case-intake-building-resolver.service"
    );
    const result = await detectIntakeAddressCollision({
      context: repContext(),
      normalizedAddressKey: "key-1",
    });
    expect(result).toEqual({ collision: true });
  });

  it("treats authorized building as non-collision", async () => {
    mockBuildingFindOne.mockReturnValue({
      lean: vi.fn().mockResolvedValue({ buildingId: "b-mine" }),
    });
    mockAssertBuildingAccess.mockResolvedValue({ scope: { mode: "assigned" } });
    const { detectIntakeAddressCollision } = await import(
      "@/modules/debt-cases/services/debt-case-intake-building-resolver.service"
    );
    const result = await detectIntakeAddressCollision({
      context: repContext(),
      normalizedAddressKey: "key-1",
    });
    expect(result).toEqual({ collision: false, authorizedBuildingId: "b-mine" });
  });
});

describe("resolveRepAssignedBuilding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns building id for assigned representative", async () => {
    mockBuildingFindOne.mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({ buildingId: "b-rep" }),
      }),
    });
    const { resolveRepAssignedBuilding } = await import(
      "@/modules/debt-cases/services/debt-case-intake-building-resolver.service"
    );
    const id = await resolveRepAssignedBuilding(repContext());
    expect(id).toBe("b-rep");
  });
});
