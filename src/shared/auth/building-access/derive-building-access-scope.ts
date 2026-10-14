import { AccountStatus } from "@/modules/users/domain/account-status";
import { UserRole } from "@/modules/users/domain/user-role";
import {
  BuildingScopeMode,
  type BuildingAccessScope,
} from "@/shared/auth/building-access/building-access-scope.types";

/** Pure scope derivation from current account state and DB-resolved assignments (CP6B). */
export function deriveBuildingAccessScope(input: {
  role: UserRole;
  accountStatus: AccountStatus;
  representativeBuildingPublicId: string | null;
  managementCompanyBuildingPublicIds: readonly string[];
}): BuildingAccessScope {
  const { role, accountStatus } = input;

  if (accountStatus !== AccountStatus.ACTIVE) {
    return {
      mode: BuildingScopeMode.DENIED,
      buildingIds: [],
      reason: "account_not_operational",
      accountStatus,
    };
  }

  if (role === UserRole.LAWYER_ADMIN) {
    return {
      mode: BuildingScopeMode.GLOBAL,
      buildingIds: [],
      accountStatus,
    };
  }

  if (role === UserRole.BUILDING_REP) {
    const ids = input.representativeBuildingPublicId
      ? [input.representativeBuildingPublicId]
      : [];
    return {
      mode: BuildingScopeMode.ASSIGNED,
      buildingIds: ids,
      accountStatus,
    };
  }

  if (role === UserRole.MANAGEMENT_COMPANY) {
    return {
      mode: BuildingScopeMode.ASSIGNED,
      buildingIds: [...input.managementCompanyBuildingPublicIds],
      accountStatus,
    };
  }

  return {
    mode: BuildingScopeMode.DENIED,
    buildingIds: [],
    reason: "unsupported_role",
    accountStatus,
  };
}
