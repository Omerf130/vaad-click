import "server-only";

import type { Types } from "mongoose";

import {
  OrganizationError,
  OrganizationErrorCode,
} from "@/modules/buildings/domain/organization-errors";
import { ManagementCompanyStatus } from "@/modules/management-companies/domain/management-company-status";
import { ManagementCompany } from "@/modules/management-companies/infra/management-company.model";
import { AccountStatus } from "@/modules/users/domain/account-status";
import { UserRole } from "@/modules/users/domain/user-role";
import { User } from "@/modules/users/infra/user.model";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import { connectMongo } from "@/shared/db/connect";

export type ResolvedManagementCompanyForUser = {
  managementCompanyId: string;
  managementCompanyObjectId: Types.ObjectId;
  displayName: string;
};

export async function resolveActiveManagementCompanyForUser(
  context: AuthenticatedContext,
): Promise<ResolvedManagementCompanyForUser> {
  if (context.user.role !== UserRole.MANAGEMENT_COMPANY) {
    throw new OrganizationError(OrganizationErrorCode.FORBIDDEN, "Management company role required");
  }
  if (context.user.accountStatus !== AccountStatus.ACTIVE) {
    throw new OrganizationError(
      OrganizationErrorCode.INVALID_ACCOUNT_STATUS,
      "Account must be approved",
    );
  }

  await connectMongo();
  const userDoc = await User.findById(context.user.id).select("managementCompanyId").lean();
  if (!userDoc?.managementCompanyId) {
    throw new OrganizationError(
      OrganizationErrorCode.NOT_FOUND,
      "No management company linked to user",
    );
  }

  const company = await ManagementCompany.findById(userDoc.managementCompanyId)
    .select("managementCompanyId displayName status")
    .lean();
  if (!company) {
    throw new OrganizationError(OrganizationErrorCode.NOT_FOUND, "Management company not found");
  }
  if (company.status !== ManagementCompanyStatus.ACTIVE) {
    throw new OrganizationError(
      OrganizationErrorCode.MANAGEMENT_COMPANY_INACTIVE,
      "Management company is not active",
    );
  }

  return {
    managementCompanyId: company.managementCompanyId,
    managementCompanyObjectId: userDoc.managementCompanyId,
    displayName: company.displayName,
  };
}
