import { describe, expect, it } from "vitest";

import { AccountStatus } from "@/modules/users/domain/account-status";
import { UserRole } from "@/modules/users/domain/user-role";
import { BuildingScopeMode } from "@/shared/auth/building-access/building-access-scope.types";
import { deriveBuildingAccessScope } from "@/shared/auth/building-access/derive-building-access-scope";
import {
  buildActiveBuildingScopeFilter,
  isBuildingPublicIdAuthorized,
} from "@/shared/auth/building-access/building-scope-query";

const BUILDING_A = "11111111-1111-4111-8111-111111111111";
const BUILDING_B = "22222222-2222-4222-8222-222222222222";

describe("deriveBuildingAccessScope", () => {
  it("denies operational scope for pending, rejected, disabled and locked accounts", () => {
    for (const accountStatus of [
      AccountStatus.PENDING_APPROVAL,
      AccountStatus.REJECTED,
      AccountStatus.DISABLED,
      AccountStatus.LOCKED,
    ] as const) {
      const scope = deriveBuildingAccessScope({
        role: UserRole.BUILDING_REP,
        accountStatus,
        representativeBuildingPublicId: BUILDING_A,
        managementCompanyBuildingPublicIds: [BUILDING_A],
      });
      expect(scope.mode).toBe(BuildingScopeMode.DENIED);
      expect(isBuildingPublicIdAuthorized(scope, BUILDING_A)).toBe(false);
    }
  });

  it("grants global scope to active lawyer admin", () => {
    const scope = deriveBuildingAccessScope({
      role: UserRole.LAWYER_ADMIN,
      accountStatus: AccountStatus.ACTIVE,
      representativeBuildingPublicId: null,
      managementCompanyBuildingPublicIds: [],
    });
    expect(scope.mode).toBe(BuildingScopeMode.GLOBAL);
    expect(isBuildingPublicIdAuthorized(scope, BUILDING_B)).toBe(true);
  });

  it("returns at most one building for an active building representative", () => {
    const scope = deriveBuildingAccessScope({
      role: UserRole.BUILDING_REP,
      accountStatus: AccountStatus.ACTIVE,
      representativeBuildingPublicId: BUILDING_A,
      managementCompanyBuildingPublicIds: [],
    });
    expect(scope.mode).toBe(BuildingScopeMode.ASSIGNED);
    if (scope.mode === BuildingScopeMode.ASSIGNED) {
      expect(scope.buildingIds).toEqual([BUILDING_A]);
    }
    expect(isBuildingPublicIdAuthorized(scope, BUILDING_B)).toBe(false);
  });

  it("returns empty assigned scope for active but unassigned representative", () => {
    const scope = deriveBuildingAccessScope({
      role: UserRole.BUILDING_REP,
      accountStatus: AccountStatus.ACTIVE,
      representativeBuildingPublicId: null,
      managementCompanyBuildingPublicIds: [],
    });
    expect(scope.mode).toBe(BuildingScopeMode.ASSIGNED);
    if (scope.mode === BuildingScopeMode.ASSIGNED) {
      expect(scope.buildingIds).toEqual([]);
    }
    expect(buildActiveBuildingScopeFilter(scope)).toEqual({ buildingId: { $in: [] } });
  });

  it("returns multiple buildings for management company users", () => {
    const scope = deriveBuildingAccessScope({
      role: UserRole.MANAGEMENT_COMPANY,
      accountStatus: AccountStatus.ACTIVE,
      representativeBuildingPublicId: null,
      managementCompanyBuildingPublicIds: [BUILDING_A, BUILDING_B],
    });
    if (scope.mode === BuildingScopeMode.ASSIGNED) {
      expect(scope.buildingIds).toEqual([BUILDING_A, BUILDING_B]);
    }
    expect(isBuildingPublicIdAuthorized(scope, BUILDING_B)).toBe(true);
  });

  it("ignores stale assignments when account is not operational", () => {
    const scope = deriveBuildingAccessScope({
      role: UserRole.BUILDING_REP,
      accountStatus: AccountStatus.PENDING_APPROVAL,
      representativeBuildingPublicId: BUILDING_A,
      managementCompanyBuildingPublicIds: [],
    });
    expect(scope.mode).toBe(BuildingScopeMode.DENIED);
    expect(buildActiveBuildingScopeFilter(scope)).toEqual({ buildingId: { $in: [] } });
  });
});

describe("building scope IDOR matrix (authorization only)", () => {
  it("rep A cannot authorize building B", () => {
    const scope = deriveBuildingAccessScope({
      role: UserRole.BUILDING_REP,
      accountStatus: AccountStatus.ACTIVE,
      representativeBuildingPublicId: BUILDING_A,
      managementCompanyBuildingPublicIds: [],
    });
    expect(isBuildingPublicIdAuthorized(scope, BUILDING_B)).toBe(false);
  });

  it("management company A cannot authorize building B outside its list", () => {
    const scope = deriveBuildingAccessScope({
      role: UserRole.MANAGEMENT_COMPANY,
      accountStatus: AccountStatus.ACTIVE,
      representativeBuildingPublicId: null,
      managementCompanyBuildingPublicIds: [BUILDING_A],
    });
    expect(isBuildingPublicIdAuthorized(scope, BUILDING_B)).toBe(false);
  });
});
