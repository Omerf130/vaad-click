import "server-only";

import { BuildingOrganizationalStatus } from "@/modules/buildings/domain/building-status";
import { Building } from "@/modules/buildings/infra/building.model";
import { ManagementCompany } from "@/modules/management-companies/infra/management-company.model";
import { UserRole } from "@/modules/users/domain/user-role";
import {
  getAccessibleBuildingPublicIds,
  listAccessibleBuildings,
} from "@/shared/auth/building-access";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import { connectMongo } from "@/shared/db/connect";

export type ReportScopeKind = "lawyer_admin" | "management_company" | "building_rep";

export type ReportScope = {
  kind: ReportScopeKind;
  /** Authorized building public IDs (never empty for operators when access exists). */
  buildingIds: string[];
  /** When set, filter buildings belonging to this MC (lawyer-only filter). */
  managementCompanyFilterId: string | null;
};

export class ReportAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReportAccessError";
  }
}

export async function resolveReportScope(input: {
  context: AuthenticatedContext;
  requestedBuildingId?: string | null;
  requestedManagementCompanyId?: string | null;
}): Promise<ReportScope> {
  const role = input.context.user.role;

  if (role === UserRole.LAWYER_ADMIN) {
    await connectMongo();
    let buildingIds: string[];
    if (input.requestedManagementCompanyId) {
      const company = await ManagementCompany.findOne({
        managementCompanyId: input.requestedManagementCompanyId,
      })
        .select("_id")
        .lean();
      if (!company) {
        buildingIds = [];
      } else {
        const rows = await Building.find({
          organizationalStatus: BuildingOrganizationalStatus.ACTIVE,
          managementCompanyId: company._id,
        })
          .select("buildingId")
          .lean();
        buildingIds = rows.map((r) => r.buildingId);
      }
    } else {
      const rows = await Building.find({
        organizationalStatus: BuildingOrganizationalStatus.ACTIVE,
      })
        .select("buildingId")
        .lean();
      buildingIds = rows.map((r) => r.buildingId);
    }

    if (input.requestedBuildingId) {
      if (!buildingIds.includes(input.requestedBuildingId)) {
        throw new ReportAccessError("Building not in scope");
      }
      buildingIds = [input.requestedBuildingId];
    }

    return {
      kind: "lawyer_admin",
      buildingIds,
      managementCompanyFilterId: input.requestedManagementCompanyId ?? null,
    };
  }

  if (role === UserRole.MANAGEMENT_COMPANY || role === UserRole.BUILDING_REP) {
    const accessible = await getAccessibleBuildingPublicIds(input.context);
    if (accessible.length === 0) {
      return {
        kind: role === UserRole.MANAGEMENT_COMPANY ? "management_company" : "building_rep",
        buildingIds: [],
        managementCompanyFilterId: null,
      };
    }

    if (input.requestedManagementCompanyId) {
      throw new ReportAccessError("Management company filter not allowed");
    }

    let buildingIds = accessible;
    if (input.requestedBuildingId) {
      if (!accessible.includes(input.requestedBuildingId)) {
        throw new ReportAccessError("Building not authorized");
      }
      buildingIds = [input.requestedBuildingId];
    }

    return {
      kind: role === UserRole.MANAGEMENT_COMPANY ? "management_company" : "building_rep",
      buildingIds: [...buildingIds],
      managementCompanyFilterId: null,
    };
  }

  throw new ReportAccessError("Role not permitted for reports");
}

export async function listReportBuildingOptions(context: AuthenticatedContext): Promise<
  Array<{ buildingId: string; displayName: string; city: string }>
> {
  const buildings = await listAccessibleBuildings({ context });
  return buildings.map((b) => ({
    buildingId: b.buildingId,
    displayName: b.displayName,
    city: "",
  }));
}
