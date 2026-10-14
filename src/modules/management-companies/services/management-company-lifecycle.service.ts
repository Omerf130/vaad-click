import "server-only";

import { randomUUID } from "node:crypto";

import mongoose, { Types } from "mongoose";
import { z } from "zod";

import {
  OrganizationError,
  OrganizationErrorCode,
} from "@/modules/buildings/domain/organization-errors";
import { ManagementCompanyStatus } from "@/modules/management-companies/domain/management-company-status";
import { ManagementCompany } from "@/modules/management-companies/infra/management-company.model";
import { assertLawyerAdminOrganization } from "@/modules/organizations/services/assert-lawyer-admin";
import {
  recordManagementCompanyPrimaryUserLinked,
  recordManagementCompanyRecordCreated,
  recordManagementCompanyUpdated,
} from "@/modules/organizations/services/organization-audit.service";
import { updateManagementCompanyFormSchema } from "@/modules/management-companies/validation/management-company.schema";
import { AccountStatus } from "@/modules/users/domain/account-status";
import { UserRole } from "@/modules/users/domain/user-role";
import { User } from "@/modules/users/infra/user.model";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import { AuditWriteFailedError } from "@/shared/audit/errors/audit-errors";
import { connectMongo } from "@/shared/db/connect";

const createManagementCompanySchema = z.object({
  displayName: z.string().trim().min(1).max(200),
  companyRegistrationNumber: z.string().trim().max(32).optional(),
  contactEmail: z.string().trim().email().optional(),
  contactPhone: z.string().trim().max(32).optional(),
  primaryUserId: z.string().trim().min(1),
});

function mapAuditError(error: unknown): never {
  if (error instanceof AuditWriteFailedError) {
    throw new OrganizationError(
      OrganizationErrorCode.AUDIT_PERSISTENCE,
      "Management company change could not be recorded",
    );
  }
  throw error;
}

export async function createManagementCompanyRecord(input: {
  context: AuthenticatedContext;
  payload: z.infer<typeof createManagementCompanySchema>;
  correlationId?: string;
}) {
  assertLawyerAdminOrganization(input.context);
  const parsed = createManagementCompanySchema.parse(input.payload);

  if (!Types.ObjectId.isValid(parsed.primaryUserId)) {
    throw new OrganizationError(OrganizationErrorCode.VALIDATION, "Invalid primary user id");
  }

  const primaryUser = await User.findById(parsed.primaryUserId).lean();
  if (!primaryUser || primaryUser.role !== UserRole.MANAGEMENT_COMPANY) {
    throw new OrganizationError(OrganizationErrorCode.INVALID_ROLE, "Primary user must be management company role");
  }
  if (primaryUser.accountStatus !== AccountStatus.ACTIVE) {
    throw new OrganizationError(
      OrganizationErrorCode.INVALID_ACCOUNT_STATUS,
      "Primary user must be approved",
    );
  }

  const managementCompanyId = randomUUID();
  await connectMongo();
  const session = await mongoose.startSession();
  const primaryObjectId = new Types.ObjectId(parsed.primaryUserId);

  try {
    await session.withTransaction(async () => {
      const [companyDoc] = await ManagementCompany.create(
        [
          {
            managementCompanyId,
            displayName: parsed.displayName,
            companyRegistrationNumber: parsed.companyRegistrationNumber ?? null,
            contactEmail: parsed.contactEmail ?? null,
            contactPhone: parsed.contactPhone ?? null,
            primaryUserId: primaryObjectId,
            status: ManagementCompanyStatus.ACTIVE,
            createdByUserId: new Types.ObjectId(input.context.user.id),
          },
        ],
        { session },
      );

      await User.findByIdAndUpdate(
        primaryObjectId,
        { managementCompanyId: companyDoc._id },
        { session },
      );

      await recordManagementCompanyRecordCreated({
        context: input.context,
        managementCompanyId,
        correlationId: input.correlationId,
        session,
      });

      await recordManagementCompanyPrimaryUserLinked({
        context: input.context,
        managementCompanyId,
        primaryUserId: parsed.primaryUserId,
        correlationId: input.correlationId,
        session,
      });
    });
  } catch (error) {
    mapAuditError(error);
  } finally {
    await session.endSession();
  }

  return ManagementCompany.findOne({ managementCompanyId }).lean();
}

export async function updateManagementCompanyRecord(input: {
  context: AuthenticatedContext;
  payload: z.infer<typeof updateManagementCompanyFormSchema>;
  correlationId?: string;
}) {
  assertLawyerAdminOrganization(input.context);
  const parsed = updateManagementCompanyFormSchema.parse(input.payload);

  await connectMongo();
  const company = await ManagementCompany.findOne({
    managementCompanyId: parsed.managementCompanyId,
  }).lean();
  if (!company) {
    throw new OrganizationError(OrganizationErrorCode.NOT_FOUND, "Management company not found");
  }

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await ManagementCompany.findOneAndUpdate(
        { managementCompanyId: parsed.managementCompanyId },
        {
          displayName: parsed.displayName,
          companyRegistrationNumber: parsed.companyRegistrationNumber ?? null,
          contactEmail: parsed.contactEmail ? parsed.contactEmail : null,
          contactPhone: parsed.contactPhone ?? null,
        },
        { session },
      );
      await recordManagementCompanyUpdated({
        context: input.context,
        managementCompanyId: parsed.managementCompanyId,
        correlationId: input.correlationId,
        session,
      });
    });
  } catch (error) {
    mapAuditError(error);
  } finally {
    await session.endSession();
  }

  return ManagementCompany.findOne({ managementCompanyId: parsed.managementCompanyId }).lean();
}
