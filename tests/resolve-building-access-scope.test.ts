import { beforeEach, describe, expect, it, vi } from "vitest";

import { AccountStatus } from "@/modules/users/domain/account-status";
import { UserRole } from "@/modules/users/domain/user-role";
import { BuildingScopeMode } from "@/shared/auth/building-access/building-access-scope.types";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";

const BUILDING_A = "11111111-1111-4111-8111-111111111111";

const buildingFindOne = vi.fn();
const buildingFind = vi.fn();
const userFindById = vi.fn();

vi.mock("@/modules/buildings/infra/building.model", () => ({
  Building: {
    findOne: (...args: unknown[]) => buildingFindOne(...args),
    find: (...args: unknown[]) => buildingFind(...args),
  },
}));

vi.mock("@/modules/users/infra/user.model", () => ({
  User: {
    findById: (...args: unknown[]) => userFindById(...args),
  },
}));

const mongooseTypes = {
  ObjectId: Object.assign(
    class {
      constructor(public id: string) {}
    },
    { isValid: (id: string) => /^[a-f0-9]{24}$/i.test(id) },
  ),
};

vi.mock("mongoose", () => ({
  Types: mongooseTypes,
}));

function context(partial: Partial<AuthenticatedContext["user"]>): AuthenticatedContext {
  return {
    user: {
      id: "507f1f77bcf86cd799439011",
      email: "u@example.com",
      fullName: "User",
      role: UserRole.BUILDING_REP,
      accountStatus: AccountStatus.ACTIVE,
      ...partial,
    },
    session: {} as AuthenticatedContext["session"],
  };
}

describe("resolveBuildingAccessScope (DB-backed)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    buildingFind.mockReturnValue({
      select: () => ({ lean: async () => [] }),
    });
  });

  it("does not query assignments when account is pending", async () => {
    const { resolveBuildingAccessScope } = await import(
      "@/shared/auth/building-access/resolve-building-access-scope"
    );
    const scope = await resolveBuildingAccessScope(
      context({ accountStatus: AccountStatus.PENDING_APPROVAL }),
    );
    expect(scope.mode).toBe(BuildingScopeMode.DENIED);
    expect(buildingFindOne).not.toHaveBeenCalled();
    expect(userFindById).not.toHaveBeenCalled();
  });

  it("resolves representative assignment from MongoDB", async () => {
    buildingFindOne.mockReturnValue({
      select: () => ({ lean: async () => ({ buildingId: BUILDING_A }) }),
    });

    const { resolveBuildingAccessScope } = await import(
      "@/shared/auth/building-access/resolve-building-access-scope"
    );
    const scope = await resolveBuildingAccessScope(context({ role: UserRole.BUILDING_REP }));
    expect(scope.mode).toBe(BuildingScopeMode.ASSIGNED);
    if (scope.mode === BuildingScopeMode.ASSIGNED) {
      expect(scope.buildingIds).toEqual([BUILDING_A]);
    }
  });

  it("resolves management company buildings from MongoDB", async () => {
    userFindById.mockReturnValue({
      select: () => ({
        lean: async () => ({ managementCompanyId: "company-doc" }),
      }),
    });
    buildingFind.mockReturnValue({
      select: () => ({
        lean: async () => [{ buildingId: BUILDING_A }],
      }),
    });

    const { resolveBuildingAccessScope } = await import(
      "@/shared/auth/building-access/resolve-building-access-scope"
    );
    const scope = await resolveBuildingAccessScope(
      context({ role: UserRole.MANAGEMENT_COMPANY }),
    );
    if (scope.mode === BuildingScopeMode.ASSIGNED) {
      expect(scope.buildingIds).toEqual([BUILDING_A]);
    }
  });
});
