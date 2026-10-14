import "server-only";

import { Building } from "@/modules/buildings/infra/building.model";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import {
  BuildingAccessError,
  BuildingAccessErrorCode,
} from "@/shared/auth/building-access/building-access.errors";
import { isWellFormedBuildingPublicId } from "@/shared/auth/building-access/building-public-id";
import {
  buildActiveBuildingScopeFilter,
  isBuildingPublicIdAuthorized,
} from "@/shared/auth/building-access/building-scope-query";
import { resolveBuildingAccessScope } from "@/shared/auth/building-access/resolve-building-access-scope";

export async function assertBuildingAccess(input: {
  context: AuthenticatedContext;
  buildingPublicId: string;
}): Promise<{ scope: Awaited<ReturnType<typeof resolveBuildingAccessScope>> }> {
  if (!isWellFormedBuildingPublicId(input.buildingPublicId)) {
    throw new BuildingAccessError(
      BuildingAccessErrorCode.INVALID_BUILDING_ID,
      "Building access denied",
    );
  }

  const scope = await resolveBuildingAccessScope(input.context);
  if (!isBuildingPublicIdAuthorized(scope, input.buildingPublicId)) {
    throw new BuildingAccessError(
      BuildingAccessErrorCode.DENIED,
      "Building access denied",
    );
  }

  return { scope };
}

/**
 * Load a building document only when it falls within the resolved scope filter.
 * Client-supplied IDs are never trusted without this intersection.
 */
export async function findAccessibleBuildingByPublicId(input: {
  context: AuthenticatedContext;
  buildingPublicId: string;
}) {
  if (!isWellFormedBuildingPublicId(input.buildingPublicId)) {
    return null;
  }

  const scope = await resolveBuildingAccessScope(input.context);
  if (!isBuildingPublicIdAuthorized(scope, input.buildingPublicId)) {
    return null;
  }

  const scopeFilter = buildActiveBuildingScopeFilter(scope);
  return Building.findOne({
    ...scopeFilter,
    buildingId: input.buildingPublicId,
  })
    .select("buildingId displayName organizationalStatus")
    .lean();
}

export async function listAccessibleBuildings(input: { context: AuthenticatedContext }) {
  const scope = await resolveBuildingAccessScope(input.context);
  const scopeFilter = buildActiveBuildingScopeFilter(scope);
  return Building.find(scopeFilter)
    .select("buildingId displayName")
    .sort({ displayName: 1 })
    .lean();
}

export async function getAccessibleBuildingPublicIds(
  context: AuthenticatedContext,
): Promise<readonly string[]> {
  const scope = await resolveBuildingAccessScope(context);
  if (scope.mode === "denied") {
    return [];
  }
  if (scope.mode === "global") {
    const rows = await Building.find(buildActiveBuildingScopeFilter(scope))
      .select("buildingId")
      .lean();
    return rows.map((row) => row.buildingId);
  }
  return scope.buildingIds;
}
