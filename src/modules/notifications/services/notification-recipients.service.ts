import "server-only";

import { Types } from "mongoose";

import { BuildingOrganizationalStatus } from "@/modules/buildings/domain/building-status";
import { Building } from "@/modules/buildings/infra/building.model";
import { ManagementCompany } from "@/modules/management-companies/infra/management-company.model";
import { AccountStatus } from "@/modules/users/domain/account-status";
import { UserRole } from "@/modules/users/domain/user-role";
import { User } from "@/modules/users/infra/user.model";
import { connectMongo } from "@/shared/db/connect";

function uniqueObjectIdStrings(ids: Types.ObjectId[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    const s = id.toString();
    if (!seen.has(s)) {
      seen.add(s);
      out.push(s);
    }
  }
  return out;
}

export async function listActiveLawyerAdminUserIds(): Promise<string[]> {
  await connectMongo();
  const rows = await User.find({
    role: UserRole.LAWYER_ADMIN,
    accountStatus: AccountStatus.ACTIVE,
  })
    .select("_id")
    .lean();
  return rows.map((row) => row._id.toString());
}

export async function listOperatorRecipientUserIdsForBuilding(input: {
  buildingId: string;
  extraUserIds?: string[];
}): Promise<string[]> {
  await connectMongo();
  const building = await Building.findOne({
    buildingId: input.buildingId,
    organizationalStatus: BuildingOrganizationalStatus.ACTIVE,
  }).lean();

  if (!building) {
    return [];
  }

  const candidateIds: Types.ObjectId[] = [];

  if (building.designatedRepresentativeUserId) {
    candidateIds.push(building.designatedRepresentativeUserId);
  }

  if (building.managementCompanyId) {
    const mcUsers = await User.find({
      role: UserRole.MANAGEMENT_COMPANY,
      accountStatus: AccountStatus.ACTIVE,
      managementCompanyId: building.managementCompanyId,
    })
      .select("_id")
      .lean();
    for (const row of mcUsers) {
      candidateIds.push(row._id);
    }

    const company = await ManagementCompany.findById(building.managementCompanyId)
      .select("primaryUserId")
      .lean();
    if (company?.primaryUserId) {
      candidateIds.push(company.primaryUserId);
    }
  }

  for (const extra of input.extraUserIds ?? []) {
    if (Types.ObjectId.isValid(extra)) {
      candidateIds.push(new Types.ObjectId(extra));
    }
  }

  const uniqueIds = uniqueObjectIdStrings(candidateIds);
  if (uniqueIds.length === 0) {
    return [];
  }

  const active = await User.find({
    _id: { $in: uniqueIds.map((id) => new Types.ObjectId(id)) },
    accountStatus: AccountStatus.ACTIVE,
    role: { $in: [UserRole.BUILDING_REP, UserRole.MANAGEMENT_COMPANY] },
  })
    .select("_id")
    .lean();

  return active.map((row) => row._id.toString());
}

export async function listManagementCompanyRecipientUserIds(input: {
  managementCompanyObjectId: Types.ObjectId;
}): Promise<string[]> {
  await connectMongo();
  const rows = await User.find({
    role: UserRole.MANAGEMENT_COMPANY,
    accountStatus: AccountStatus.ACTIVE,
    managementCompanyId: input.managementCompanyObjectId,
  })
    .select("_id")
    .lean();

  const company = await ManagementCompany.findById(input.managementCompanyObjectId)
    .select("primaryUserId")
    .lean();

  const ids = rows.map((row) => row._id);
  if (company?.primaryUserId) {
    ids.push(company.primaryUserId);
  }

  const active = await User.find({
    _id: { $in: uniqueObjectIdStrings(ids).map((id) => new Types.ObjectId(id)) },
    accountStatus: AccountStatus.ACTIVE,
    role: UserRole.MANAGEMENT_COMPANY,
  })
    .select("_id")
    .lean();

  return active.map((row) => row._id.toString());
}
