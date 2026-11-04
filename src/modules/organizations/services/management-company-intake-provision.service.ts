import "server-only";

import { randomUUID } from "node:crypto";

import mongoose, { Types } from "mongoose";

import { ManagementCompanyStatus } from "@/modules/management-companies/domain/management-company-status";
import { ManagementCompany } from "@/modules/management-companies/infra/management-company.model";
import { recordManagementCompanyRecordCreated } from "@/modules/organizations/services/organization-audit.service";
import { UserRole } from "@/modules/users/domain/user-role";
import { User } from "@/modules/users/infra/user.model";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import { connectMongo } from "@/shared/db/connect";

export type EnsuredManagementCompany = {
  managementCompanyId: string;
  managementCompanyObjectId: Types.ObjectId;
  displayName: string;
  created: boolean;
};

/** Ensures the MC operator has a company record (self-service on first intake). */
export async function ensureManagementCompanyForIntakeUser(input: {
  context: AuthenticatedContext;
  correlationId?: string;
  session?: mongoose.ClientSession;
}): Promise<EnsuredManagementCompany> {
  if (input.context.user.role !== UserRole.MANAGEMENT_COMPANY) {
    throw new Error("Management company role required");
  }

  await connectMongo();
  const userObjectId = new Types.ObjectId(input.context.user.id);
  let userQuery = User.findById(userObjectId).select("managementCompanyId fullName");
  if (input.session) {
    userQuery = userQuery.session(input.session);
  }
  const user = await userQuery.lean();
  if (!user) {
    throw new Error("User not found");
  }

  if (user.managementCompanyId) {
    let companyQuery = ManagementCompany.findById(user.managementCompanyId).select(
      "managementCompanyId displayName status",
    );
    if (input.session) {
      companyQuery = companyQuery.session(input.session);
    }
    const company = await companyQuery.lean();
    if (!company || company.status !== ManagementCompanyStatus.ACTIVE) {
      throw new Error("Management company inactive");
    }
    return {
      managementCompanyId: company.managementCompanyId,
      managementCompanyObjectId: user.managementCompanyId,
      displayName: company.displayName,
      created: false,
    };
  }

  const managementCompanyId = randomUUID();
  const displayName = `${input.context.user.fullName} — חברת ניהול`.slice(0, 200);
  const createOptions = input.session ? { session: input.session } : undefined;
  const [companyDoc] = await ManagementCompany.create(
    [
      {
        managementCompanyId,
        displayName,
        companyRegistrationNumber: null,
        contactEmail: input.context.user.email ?? null,
        contactPhone: null,
        primaryUserId: userObjectId,
        status: ManagementCompanyStatus.ACTIVE,
        createdByUserId: userObjectId,
      },
    ],
    createOptions,
  );
  if (!companyDoc) {
    throw new Error("Management company creation failed");
  }

  await User.findByIdAndUpdate(
    userObjectId,
    { managementCompanyId: companyDoc._id },
    { session: input.session ?? undefined },
  );

  if (input.session) {
    await recordManagementCompanyRecordCreated({
      context: input.context,
      managementCompanyId,
      correlationId: input.correlationId,
      session: input.session,
    });
  }

  return {
    managementCompanyId,
    managementCompanyObjectId: companyDoc._id,
    displayName,
    created: true,
  };
}
