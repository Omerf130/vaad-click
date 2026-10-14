import "server-only";

import { BuildingOrganizationalStatus } from "@/modules/buildings/domain/building-status";
import { Building } from "@/modules/buildings/infra/building.model";
import { ManagementCompany } from "@/modules/management-companies/infra/management-company.model";
import type { AdminManagementCompanyListParams } from "@/modules/management-companies/validation/admin-management-company-list.schema";
import { ADMIN_MANAGEMENT_COMPANY_LIST_PAGE_SIZE } from "@/modules/management-companies/validation/admin-management-company-list.schema";
import { User } from "@/modules/users/infra/user.model";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import { connectMongo } from "@/shared/db/connect";

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export type AdminManagementCompanyListItem = {
  managementCompanyId: string;
  displayName: string;
  status: string;
  primaryUserName: string | null;
  buildingCount: number;
};

export async function listAdminManagementCompanies(input: {
  context: AuthenticatedContext;
  params: AdminManagementCompanyListParams;
}) {
  void input.context;
  await connectMongo();

  const filter: Record<string, unknown> = {};
  if (input.params.q) {
    const pattern = escapeRegex(input.params.q.trim());
    filter.displayName = { $regex: pattern, $options: "i" };
  }

  const page = input.params.page;
  const skip = (page - 1) * ADMIN_MANAGEMENT_COMPANY_LIST_PAGE_SIZE;

  const [rows, total] = await Promise.all([
    ManagementCompany.find(filter)
      .sort({ displayName: 1 })
      .skip(skip)
      .limit(ADMIN_MANAGEMENT_COMPANY_LIST_PAGE_SIZE)
      .populate("primaryUserId", "fullName")
      .lean(),
    ManagementCompany.countDocuments(filter),
  ]);

  const items: AdminManagementCompanyListItem[] = await Promise.all(
    rows.map(async (row) => {
      const primary = row.primaryUserId as { fullName?: string } | null;
      const buildingCount = await Building.countDocuments({
        managementCompanyId: row._id,
        organizationalStatus: BuildingOrganizationalStatus.ACTIVE,
      });
      return {
        managementCompanyId: row.managementCompanyId,
        displayName: row.displayName,
        status: row.status,
        primaryUserName: primary?.fullName ?? null,
        buildingCount,
      };
    }),
  );

  return {
    items,
    total,
    page,
    pageSize: ADMIN_MANAGEMENT_COMPANY_LIST_PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / ADMIN_MANAGEMENT_COMPANY_LIST_PAGE_SIZE)),
  };
}

export type AdminManagementCompanyDetail = {
  managementCompanyId: string;
  displayName: string;
  companyRegistrationNumber: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  status: string;
  primaryUser: { id: string; fullName: string; email: string } | null;
  buildings: { buildingId: string; displayName: string; city: string }[];
};

export async function getAdminManagementCompanyDetail(input: {
  context: AuthenticatedContext;
  managementCompanyId: string;
}): Promise<AdminManagementCompanyDetail | null> {
  void input.context;
  await connectMongo();

  const company = await ManagementCompany.findOne({
    managementCompanyId: input.managementCompanyId,
  }).lean();
  if (!company) {
    return null;
  }

  let primaryUser: AdminManagementCompanyDetail["primaryUser"] = null;
  if (company.primaryUserId) {
    const user = await User.findById(company.primaryUserId).select("fullName email").lean();
    if (user?.email) {
      primaryUser = {
        id: user._id.toString(),
        fullName: user.fullName,
        email: user.email,
      };
    }
  }

  const buildings = await Building.find({
    managementCompanyId: company._id,
    organizationalStatus: BuildingOrganizationalStatus.ACTIVE,
  })
    .select("buildingId displayName address.city")
    .sort({ displayName: 1 })
    .lean();

  return {
    managementCompanyId: company.managementCompanyId,
    displayName: company.displayName,
    companyRegistrationNumber: company.companyRegistrationNumber ?? null,
    contactEmail: company.contactEmail ?? null,
    contactPhone: company.contactPhone ?? null,
    status: company.status,
    primaryUser,
    buildings: buildings.map((b) => ({
      buildingId: b.buildingId,
      displayName: b.displayName,
      city: b.address.city,
    })),
  };
}
