import type { AccountStatus } from "@/modules/users/domain/account-status";

export const BuildingScopeMode = {
  DENIED: "denied",
  GLOBAL: "global",
  ASSIGNED: "assigned",
} as const;

export type BuildingScopeMode = (typeof BuildingScopeMode)[keyof typeof BuildingScopeMode];

export type BuildingScopeDenialReason =
  | "account_not_operational"
  | "unsupported_role";

export type BuildingAccessScope =
  | {
      mode: typeof BuildingScopeMode.DENIED;
      buildingIds: readonly [];
      reason: BuildingScopeDenialReason;
      accountStatus: AccountStatus;
    }
  | {
      mode: typeof BuildingScopeMode.GLOBAL;
      buildingIds: readonly [];
      accountStatus: AccountStatus;
    }
  | {
      mode: typeof BuildingScopeMode.ASSIGNED;
      buildingIds: readonly string[];
      accountStatus: AccountStatus;
    };

export function hasOperationalBuildingScope(scope: BuildingAccessScope): boolean {
  if (scope.mode === BuildingScopeMode.DENIED) {
    return false;
  }
  if (scope.mode === BuildingScopeMode.GLOBAL) {
    return true;
  }
  return scope.buildingIds.length > 0;
}
