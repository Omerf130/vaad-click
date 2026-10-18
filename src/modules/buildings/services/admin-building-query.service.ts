import "server-only";

import {
  BuildingOrganizationalStatus,
  LawyerVerificationStatus,
} from "@/modules/buildings/domain/building-status";
import { adminBuildingVerificationFilter } from "@/modules/buildings/validation/admin-building-list.schema";
import { Building } from "@/modules/buildings/infra/building.model";
import { ManagementCompanyStatus } from "@/modules/management-companies/domain/management-company-status";
import { ManagementCompany } from "@/modules/management-companies/infra/management-company.model";
import { AccountStatus } from "@/modules/users/domain/account-status";
import { UserRole } from "@/modules/users/domain/user-role";
import { User } from "@/modules/users/infra/user.model";
import type { AdminBuildingListParams } from "@/modules/buildings/validation/admin-building-list.schema";
import { ADMIN_BUILDING_LIST_PAGE_SIZE } from "@/modules/buildings/validation/admin-building-list.schema";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import { connectMongo } from "@/shared/db/connect";

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildFilter(params: AdminBuildingListParams): Record<string, unknown> {
  const filter: Record<string, unknown> = {};
  if (params.status) {
    filter.organizationalStatus = params.status;
  }
  if (params.q) {
    const pattern = escapeRegex(params.q.trim());
    filter.$or = [
      { displayName: { $regex: pattern, $options: "i" } },
      { "address.city": { $regex: pattern, $options: "i" } },
      { "address.street": { $regex: pattern, $options: "i" } },
      { "address.houseNumber": { $regex: pattern, $options: "i" } },
    ];
  }
  if (params.verification === adminBuildingVerificationFilter.PENDING) {
    filter.lawyerVerificationStatus = { $ne: LawyerVerificationStatus.VERIFIED };
  } else if (params.verification === adminBuildingVerificationFilter.VERIFIED) {
    filter.lawyerVerificationStatus = LawyerVerificationStatus.VERIFIED;
  }
  return filter;
}

export type AdminBuildingListItem = {
  buildingId: string;
  displayName: string;
  city: string;
  street: string;
  houseNumber: string;
  organizationalStatus: string;
  lawyerVerificationStatus: string;
  representativeName: string | null;
  managementCompanyName: string | null;
};

export async function listAdminBuildings(input: {
  context: AuthenticatedContext;
  params: AdminBuildingListParams;
}) {
  void input.context;
  await connectMongo();
  const filter = buildFilter(input.params);
  const page = input.params.page;
  const skip = (page - 1) * ADMIN_BUILDING_LIST_PAGE_SIZE;

  const [rows, total] = await Promise.all([
    Building.find(filter)
      .sort({ displayName: 1 })
      .skip(skip)
      .limit(ADMIN_BUILDING_LIST_PAGE_SIZE)
      .populate("designatedRepresentativeUserId", "fullName")
      .populate("managementCompanyId", "displayName")
      .lean(),
    Building.countDocuments(filter),
  ]);

  const items: AdminBuildingListItem[] = rows.map((row) => {
    const rep = row.designatedRepresentativeUserId as { fullName?: string } | null;
    const company = row.managementCompanyId as { displayName?: string } | null;
    return {
      buildingId: row.buildingId,
      displayName: row.displayName,
      city: row.address.city,
      street: row.address.street,
      houseNumber: row.address.houseNumber,
      organizationalStatus: row.organizationalStatus,
      lawyerVerificationStatus: row.lawyerVerificationStatus,
      representativeName: rep?.fullName ?? null,
      managementCompanyName: company?.displayName ?? null,
    };
  });

  return {
    items,
    total,
    page,
    pageSize: ADMIN_BUILDING_LIST_PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / ADMIN_BUILDING_LIST_PAGE_SIZE)),
  };
}

export type AdminBuildingDetail = {
  buildingId: string;
  displayName: string;
  address: {
    city: string;
    street: string;
    houseNumber: string;
    postalCode?: string | null;
  };
  organizationalStatus: string;
  lawyerVerificationStatus: string;
  unitCount: number | null;
  averageMonthlyVaadFeeMinor: number | null;
  representative: { id: string; fullName: string; email: string } | null;
  managementCompany: { managementCompanyId: string; displayName: string } | null;
  duplicateExceptionReason: string | null;
};

export async function getAdminBuildingDetail(input: {
  context: AuthenticatedContext;
  buildingId: string;
}): Promise<AdminBuildingDetail | null> {
  void input.context;
  await connectMongo();
  const row = await Building.findOne({ buildingId: input.buildingId }).lean();
  if (!row) {
    return null;
  }

  let representative: AdminBuildingDetail["representative"] = null;
  if (row.designatedRepresentativeUserId) {
    const user = await User.findById(row.designatedRepresentativeUserId)
      .select("fullName email")
      .lean();
    if (user?.email) {
      representative = {
        id: user._id.toString(),
        fullName: user.fullName,
        email: user.email,
      };
    }
  }

  let managementCompany: AdminBuildingDetail["managementCompany"] = null;
  if (row.managementCompanyId) {
    const company = await ManagementCompany.findById(row.managementCompanyId)
      .select("managementCompanyId displayName")
      .lean();
    if (company) {
      managementCompany = {
        managementCompanyId: company.managementCompanyId,
        displayName: company.displayName,
      };
    }
  }

  return {
    buildingId: row.buildingId,
    displayName: row.displayName,
    address: row.address,
    organizationalStatus: row.organizationalStatus,
    lawyerVerificationStatus: row.lawyerVerificationStatus,
    unitCount: row.unitCount ?? null,
    averageMonthlyVaadFeeMinor: row.averageMonthlyVaadFeeMinor ?? null,
    representative,
    managementCompany,
    duplicateExceptionReason: row.duplicateException?.reasonInternal ?? null,
  };
}

export type EligibleRepresentativeOption = {
  id: string;
  fullName: string;
  email: string;
};

export async function listEligibleBuildingRepresentatives(input: {
  buildingId: string;
}): Promise<EligibleRepresentativeOption[]> {
  await connectMongo();

  const takenIds = await Building.find({
    organizationalStatus: BuildingOrganizationalStatus.ACTIVE,
    designatedRepresentativeUserId: { $ne: null },
    buildingId: { $ne: input.buildingId },
  }).distinct("designatedRepresentativeUserId");

  const users = await User.find({
    role: UserRole.BUILDING_REP,
    accountStatus: AccountStatus.ACTIVE,
    _id: { $nin: takenIds },
  })
    .select("fullName email")
    .sort({ fullName: 1 })
    .lean();

  return users
    .filter((user) => user.email)
    .map((user) => ({
      id: user._id.toString(),
      fullName: user.fullName,
      email: user.email!,
    }));
}

export async function listActiveManagementCompaniesForLinking(): Promise<
  { managementCompanyId: string; displayName: string }[]
> {
  await connectMongo();
  const rows = await ManagementCompany.find({ status: ManagementCompanyStatus.ACTIVE })
    .select("managementCompanyId displayName")
    .sort({ displayName: 1 })
    .lean();
  return rows.map((row) => ({
    managementCompanyId: row.managementCompanyId,
    displayName: row.displayName,
  }));
}

export async function listEligibleManagementCompanyPrimaryUsers(): Promise<
  EligibleRepresentativeOption[]
> {
  await connectMongo();
  const users = await User.find({
    role: UserRole.MANAGEMENT_COMPANY,
    accountStatus: AccountStatus.ACTIVE,
    $or: [{ managementCompanyId: null }, { managementCompanyId: { $exists: false } }],
  })
    .select("fullName email")
    .sort({ fullName: 1 })
    .lean();

  return users
    .filter((user) => user.email)
    .map((user) => ({
      id: user._id.toString(),
      fullName: user.fullName,
      email: user.email!,
    }));
}
