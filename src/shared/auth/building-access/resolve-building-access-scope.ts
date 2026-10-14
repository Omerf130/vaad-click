import "server-only";

import { Types } from "mongoose";

import { BuildingOrganizationalStatus } from "@/modules/buildings/domain/building-status";
import { Building } from "@/modules/buildings/infra/building.model";
import { AccountStatus } from "@/modules/users/domain/account-status";
import { UserRole } from "@/modules/users/domain/user-role";
import { User } from "@/modules/users/infra/user.model";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import type { BuildingAccessScope } from "@/shared/auth/building-access/building-access-scope.types";
import { deriveBuildingAccessScope } from "@/shared/auth/building-access/derive-building-access-scope";

export async function resolveBuildingAccessScope(
  context: AuthenticatedContext,
): Promise<BuildingAccessScope> {
  const { user } = context;

  let representativeBuildingPublicId: string | null = null;
  let managementCompanyBuildingPublicIds: string[] = [];

  if (user.accountStatus === AccountStatus.ACTIVE) {
    if (user.role === UserRole.BUILDING_REP) {
      const building = await Building.findOne({
        designatedRepresentativeUserId: new Types.ObjectId(user.id),
        organizationalStatus: BuildingOrganizationalStatus.ACTIVE,
      })
        .select("buildingId")
        .lean();
      representativeBuildingPublicId = building?.buildingId ?? null;
    } else if (user.role === UserRole.MANAGEMENT_COMPANY) {
      const userDoc = await User.findById(user.id).select("managementCompanyId").lean();
      if (userDoc?.managementCompanyId) {
        const buildings = await Building.find({
          managementCompanyId: userDoc.managementCompanyId,
          organizationalStatus: BuildingOrganizationalStatus.ACTIVE,
        })
          .select("buildingId")
          .lean();
        managementCompanyBuildingPublicIds = buildings.map((row) => row.buildingId);
      }
    }
  }

  return deriveBuildingAccessScope({
    role: user.role,
    accountStatus: user.accountStatus,
    representativeBuildingPublicId,
    managementCompanyBuildingPublicIds,
  });
}
