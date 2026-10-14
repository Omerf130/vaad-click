import "server-only";

export {
  BuildingScopeMode,
  hasOperationalBuildingScope,
  type BuildingAccessScope,
} from "@/shared/auth/building-access/building-access-scope.types";
export { deriveBuildingAccessScope } from "@/shared/auth/building-access/derive-building-access-scope";
export {
  buildActiveBuildingScopeFilter,
  isBuildingPublicIdAuthorized,
} from "@/shared/auth/building-access/building-scope-query";
export { isWellFormedBuildingPublicId } from "@/shared/auth/building-access/building-public-id";
export {
  BuildingAccessError,
  BuildingAccessErrorCode,
} from "@/shared/auth/building-access/building-access.errors";
export { resolveBuildingAccessScope } from "@/shared/auth/building-access/resolve-building-access-scope";
export {
  assertBuildingAccess,
  findAccessibleBuildingByPublicId,
  getAccessibleBuildingPublicIds,
  listAccessibleBuildings,
} from "@/shared/auth/building-access/assert-building-access";
