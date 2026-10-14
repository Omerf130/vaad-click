import "server-only";

import { BuildingOrganizationalStatus } from "@/modules/buildings/domain/building-status";
import { Building } from "@/modules/buildings/infra/building.model";
import { ManagementCompany } from "@/modules/management-companies/infra/management-company.model";
import { AccountStatus } from "@/modules/users/domain/account-status";
import { UserRole } from "@/modules/users/domain/user-role";
import { User } from "@/modules/users/infra/user.model";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import { connectMongo } from "@/shared/db/connect";

const MANAGED_ROLES = [UserRole.BUILDING_REP, UserRole.MANAGEMENT_COMPANY] as const;

export type AdminDashboardStats = {
  registeredUsers: number;
  pendingApprovals: number;
  activeBuildings: number;
  managementCompanies: number;
};

export type PendingRegistrationPreview = {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  createdAt: Date;
};

export async function getAdminDashboardStats(
  _context: AuthenticatedContext,
): Promise<AdminDashboardStats> {
  void _context;
  await connectMongo();

  const managedUserFilter = { role: { $in: MANAGED_ROLES } };

  const [registeredUsers, pendingApprovals, activeBuildings, managementCompanies] =
    await Promise.all([
      User.countDocuments(managedUserFilter),
      User.countDocuments({
        ...managedUserFilter,
        accountStatus: AccountStatus.PENDING_APPROVAL,
      }),
      Building.countDocuments({
        organizationalStatus: BuildingOrganizationalStatus.ACTIVE,
      }),
      ManagementCompany.countDocuments({}),
    ]);

  return {
    registeredUsers,
    pendingApprovals,
    activeBuildings,
    managementCompanies,
  };
}

export async function listPendingRegistrationPreviews(
  _context: AuthenticatedContext,
  limit = 5,
): Promise<PendingRegistrationPreview[]> {
  void _context;
  await connectMongo();

  const rows = await User.find({
    role: { $in: MANAGED_ROLES },
    accountStatus: AccountStatus.PENDING_APPROVAL,
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select("fullName email role createdAt")
    .lean();

  return rows.map((row) => ({
    id: row._id.toString(),
    fullName: row.fullName,
    email: row.email ?? "",
    role: row.role as UserRole,
    createdAt: row.createdAt,
  }));
}
