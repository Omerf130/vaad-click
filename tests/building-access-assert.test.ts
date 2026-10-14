import { beforeEach, describe, expect, it, vi } from "vitest";

import { AccountStatus } from "@/modules/users/domain/account-status";
import { UserRole } from "@/modules/users/domain/user-role";
import {
  BuildingAccessError,
  BuildingAccessErrorCode,
} from "@/shared/auth/building-access/building-access.errors";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";

const BUILDING_A = "11111111-1111-4111-8111-111111111111";
const BUILDING_B = "22222222-2222-4222-8222-222222222222";

const mockResolveScope = vi.fn();

vi.mock("@/shared/auth/building-access/resolve-building-access-scope", () => ({
  resolveBuildingAccessScope: (...args: unknown[]) => mockResolveScope(...args),
}));

const buildingFindOne = vi.fn();

vi.mock("@/modules/buildings/infra/building.model", () => ({
  Building: {
    findOne: (...args: unknown[]) => buildingFindOne(...args),
  },
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

describe("assertBuildingAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects malformed building IDs without querying", async () => {
    const { assertBuildingAccess } = await import(
      "@/shared/auth/building-access/assert-building-access"
    );
    await expect(
      assertBuildingAccess({ context: context(UserRole.BUILDING_REP), buildingPublicId: "not-a-uuid" }),
    ).rejects.toMatchObject({ code: BuildingAccessErrorCode.INVALID_BUILDING_ID });
    expect(mockResolveScope).not.toHaveBeenCalled();
  });

  it("denies cross-tenant building access for representatives", async () => {
    mockResolveScope.mockResolvedValue({
      mode: "assigned",
      buildingIds: [BUILDING_A],
      accountStatus: AccountStatus.ACTIVE,
    });

    const { assertBuildingAccess } = await import(
      "@/shared/auth/building-access/assert-building-access"
    );
    await expect(
      assertBuildingAccess({ context: context(UserRole.BUILDING_REP), buildingPublicId: BUILDING_B }),
    ).rejects.toBeInstanceOf(BuildingAccessError);
  });

  it("findAccessibleBuildingByPublicId intersects client id with scope filter", async () => {
    mockResolveScope.mockResolvedValue({
      mode: "assigned",
      buildingIds: [BUILDING_A],
      accountStatus: AccountStatus.ACTIVE,
    });
    buildingFindOne.mockReturnValue({
      select: () => ({
        lean: async () => ({ buildingId: BUILDING_A, displayName: "A" }),
      }),
    });

    const { findAccessibleBuildingByPublicId } = await import(
      "@/shared/auth/building-access/assert-building-access"
    );
    const row = await findAccessibleBuildingByPublicId({
      context: context(UserRole.BUILDING_REP),
      buildingPublicId: BUILDING_A,
    });
    expect(row?.buildingId).toBe(BUILDING_A);
    expect(buildingFindOne).toHaveBeenCalledWith(
      expect.objectContaining({
        buildingId: BUILDING_A,
        organizationalStatus: "active",
      }),
    );

    const denied = await findAccessibleBuildingByPublicId({
      context: context(UserRole.BUILDING_REP),
      buildingPublicId: BUILDING_B,
    });
    expect(denied).toBeNull();
    expect(buildingFindOne).toHaveBeenCalledTimes(1);
  });
});
