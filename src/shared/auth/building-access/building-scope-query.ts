import { BuildingOrganizationalStatus } from "@/modules/buildings/domain/building-status";
import {
  BuildingScopeMode,
  type BuildingAccessScope,
} from "@/shared/auth/building-access/building-access-scope.types";

export type ActiveBuildingScopeFilter = {
  organizationalStatus: typeof BuildingOrganizationalStatus.ACTIVE;
  buildingId?: { $in: readonly string[] };
};

/**
 * Mongo filter for active buildings visible under the given scope.
 * Never accept client-supplied building IDs without intersecting with this filter.
 */
export function buildActiveBuildingScopeFilter(
  scope: BuildingAccessScope,
): ActiveBuildingScopeFilter | { buildingId: { $in: [] } } {
  if (scope.mode === BuildingScopeMode.DENIED) {
    return { buildingId: { $in: [] } };
  }

  const base = { organizationalStatus: BuildingOrganizationalStatus.ACTIVE } as const;

  if (scope.mode === BuildingScopeMode.GLOBAL) {
    return base;
  }

  if (scope.buildingIds.length === 0) {
    return { buildingId: { $in: [] } };
  }

  return {
    ...base,
    buildingId: { $in: scope.buildingIds },
  };
}

export function isBuildingPublicIdAuthorized(
  scope: BuildingAccessScope,
  buildingPublicId: string,
): boolean {
  if (scope.mode === BuildingScopeMode.DENIED) {
    return false;
  }
  if (scope.mode === BuildingScopeMode.GLOBAL) {
    return true;
  }
  return scope.buildingIds.includes(buildingPublicId);
}
