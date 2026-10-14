import "server-only";

import { Types } from "mongoose";

import { BuildingOrganizationalStatus } from "@/modules/buildings/domain/building-status";
import { Building } from "@/modules/buildings/infra/building.model";
import { ManagementCompany } from "@/modules/management-companies/infra/management-company.model";
import { Session } from "@/modules/auth/infra/session.model";
import { AccountStatus } from "@/modules/users/domain/account-status";
import { UserRole } from "@/modules/users/domain/user-role";
import { User } from "@/modules/users/infra/user.model";
import type { AdminUserListParams } from "@/modules/users/validation/admin-user-list.schema";
import { ADMIN_USER_LIST_PAGE_SIZE } from "@/modules/users/validation/admin-user-list.schema";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import { connectMongo } from "@/shared/db/connect";

const MANAGED_ROLES = [UserRole.BUILDING_REP, UserRole.MANAGEMENT_COMPANY] as const;

export type AdminUserListItem = {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  accountStatus: AccountStatus;
  createdAt: Date;
};

export type AdminUserAssignment =
  | { kind: "none" }
  | {
      kind: "building_rep";
      buildingId: string;
      buildingDisplayName: string;
    }
  | {
      kind: "management_company";
      companyDisplayName: string;
      buildingCount: number;
      buildingSummaries: { buildingId: string; displayName: string }[];
    };

export type AdminUserDetail = AdminUserListItem & {
  lastSessionAt: Date | null;
  assignment: AdminUserAssignment;
};

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildListFilter(params: AdminUserListParams): Record<string, unknown> {
  const filter: Record<string, unknown> = {
    role: { $in: MANAGED_ROLES },
  };

  if (params.view === "pending") {
    filter.accountStatus = AccountStatus.PENDING_APPROVAL;
  } else if (params.status) {
    filter.accountStatus = params.status;
  }

  if (params.role) {
    filter.role = params.role;
  }

  if (params.q) {
    const pattern = escapeRegex(params.q.trim());
    filter.$or = [
      { fullName: { $regex: pattern, $options: "i" } },
      { email: { $regex: pattern, $options: "i" } },
    ];
  }

  return filter;
}

export async function countPendingApprovalUsers(
  context: AuthenticatedContext,
): Promise<number> {
  void context;
  await connectMongo();
  return User.countDocuments({
    role: { $in: MANAGED_ROLES },
    accountStatus: AccountStatus.PENDING_APPROVAL,
  });
}

export async function listAdminUsers(input: {
  context: AuthenticatedContext;
  params: AdminUserListParams;
}): Promise<{
  items: AdminUserListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  await connectMongo();
  const filter = buildListFilter(input.params);
  const page = input.params.page;
  const skip = (page - 1) * ADMIN_USER_LIST_PAGE_SIZE;

  const [rows, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(ADMIN_USER_LIST_PAGE_SIZE)
      .select("fullName email role accountStatus createdAt")
      .lean(),
    User.countDocuments(filter),
  ]);

  const items: AdminUserListItem[] = rows.map((row) => ({
    id: row._id.toString(),
    fullName: row.fullName,
    email: row.email ?? "",
    role: row.role as UserRole,
    accountStatus: row.accountStatus as AccountStatus,
    createdAt: row.createdAt,
  }));

  const totalPages = Math.max(1, Math.ceil(total / ADMIN_USER_LIST_PAGE_SIZE));

  return {
    items,
    total,
    page,
    pageSize: ADMIN_USER_LIST_PAGE_SIZE,
    totalPages,
  };
}

async function resolveAssignment(user: {
  _id: Types.ObjectId;
  role: UserRole;
  managementCompanyId?: Types.ObjectId | null;
}): Promise<AdminUserAssignment> {
  if (user.role === UserRole.BUILDING_REP) {
    const building = await Building.findOne({
      designatedRepresentativeUserId: user._id,
      organizationalStatus: BuildingOrganizationalStatus.ACTIVE,
    })
      .select("buildingId displayName")
      .lean();
    if (!building) {
      return { kind: "none" };
    }
    return {
      kind: "building_rep",
      buildingId: building.buildingId,
      buildingDisplayName: building.displayName,
    };
  }

  if (user.role === UserRole.MANAGEMENT_COMPANY && user.managementCompanyId) {
    const company = await ManagementCompany.findById(user.managementCompanyId)
      .select("displayName")
      .lean();
    const companyFilter = {
      managementCompanyId: user.managementCompanyId,
      organizationalStatus: BuildingOrganizationalStatus.ACTIVE,
    };
    const [buildingCount, buildings] = await Promise.all([
      Building.countDocuments(companyFilter),
      Building.find(companyFilter)
        .select("buildingId displayName")
        .sort({ displayName: 1 })
        .limit(12)
        .lean(),
    ]);

    return {
      kind: "management_company",
      companyDisplayName: company?.displayName ?? "חברת ניהול",
      buildingCount,
      buildingSummaries: buildings.map((b) => ({
        buildingId: b.buildingId,
        displayName: b.displayName,
      })),
    };
  }

  return { kind: "none" };
}

export async function getAdminUserDetail(input: {
  context: AuthenticatedContext;
  userId: string;
}): Promise<AdminUserDetail | null> {
  if (!Types.ObjectId.isValid(input.userId)) {
    return null;
  }

  await connectMongo();
  const user = await User.findOne({
    _id: input.userId,
    role: { $in: MANAGED_ROLES },
  }).lean();

  if (!user?.email) {
    return null;
  }

  const lastSession = await Session.findOne({ userId: user._id })
    .sort({ createdAt: -1 })
    .select("createdAt")
    .lean();

  const assignment = await resolveAssignment({
    _id: user._id,
    role: user.role as UserRole,
    managementCompanyId: user.managementCompanyId,
  });

  return {
    id: user._id.toString(),
    fullName: user.fullName,
    email: user.email,
    role: user.role as UserRole,
    accountStatus: user.accountStatus as AccountStatus,
    createdAt: user.createdAt,
    lastSessionAt: lastSession?.createdAt ?? null,
    assignment,
  };
}
