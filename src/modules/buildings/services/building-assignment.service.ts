import "server-only";

import mongoose, { Types } from "mongoose";
import { ZodError } from "zod";

import {
  OrganizationError,
  OrganizationErrorCode,
} from "@/modules/buildings/domain/organization-errors";
import { BuildingOrganizationalStatus } from "@/modules/buildings/domain/building-status";
import { Building } from "@/modules/buildings/infra/building.model";
import {
  assignRepresentativeInputSchema,
  linkManagementCompanyToBuildingSchema,
} from "@/modules/buildings/validation/building.schema";
import { ManagementCompanyStatus } from "@/modules/management-companies/domain/management-company-status";
import { ManagementCompany } from "@/modules/management-companies/infra/management-company.model";
import { assertLawyerAdminOrganization } from "@/modules/organizations/services/assert-lawyer-admin";
import {
  recordManagementCompanyLinked,
  recordManagementCompanyUnlinked,
  recordRepresentativeAssigned,
  recordRepresentativeRemoved,
} from "@/modules/organizations/services/organization-audit.service";
import { AccountStatus } from "@/modules/users/domain/account-status";
import { UserRole } from "@/modules/users/domain/user-role";
import { User } from "@/modules/users/infra/user.model";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import { AuditWriteFailedError } from "@/shared/audit/errors/audit-errors";
import { connectMongo } from "@/shared/db/connect";

function mapAuditError(error: unknown): never {
  if (error instanceof AuditWriteFailedError) {
    throw new OrganizationError(
      OrganizationErrorCode.AUDIT_PERSISTENCE,
      "Assignment could not be recorded",
    );
  }
  if (error instanceof ZodError) {
    throw new OrganizationError(
      OrganizationErrorCode.AUDIT_PERSISTENCE,
      "Assignment audit payload invalid",
    );
  }
  throw error;
}

function parseOrganizationInput<T>(
  schema: { parse: (value: unknown) => T },
  value: unknown,
): T {
  try {
    return schema.parse(value);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new OrganizationError(OrganizationErrorCode.VALIDATION, "Invalid assignment input");
    }
    throw error;
  }
}

async function loadActiveBuilding(buildingId: string) {
  const building = await Building.findOne({
    buildingId,
    organizationalStatus: BuildingOrganizationalStatus.ACTIVE,
  }).lean();
  if (!building) {
    throw new OrganizationError(OrganizationErrorCode.NOT_FOUND, "Building not found");
  }
  return building;
}

export async function assignBuildingRepresentative(input: {
  context: AuthenticatedContext;
  buildingId: string;
  representativeUserId: string;
  previousRepresentativeUserId?: string;
  correlationId?: string;
}) {
  assertLawyerAdminOrganization(input.context);
  assignRepresentativeInputSchema.parse(input);

  if (!Types.ObjectId.isValid(input.representativeUserId)) {
    throw new OrganizationError(OrganizationErrorCode.VALIDATION, "Invalid representative user id");
  }

  const building = await loadActiveBuilding(input.buildingId);
  const repUser = await User.findById(input.representativeUserId).lean();
  if (!repUser || repUser.role !== UserRole.BUILDING_REP) {
    throw new OrganizationError(OrganizationErrorCode.INVALID_ROLE, "User is not a building rep");
  }
  if (repUser.accountStatus !== AccountStatus.ACTIVE) {
    throw new OrganizationError(
      OrganizationErrorCode.INVALID_ACCOUNT_STATUS,
      "Representative account must be approved",
    );
  }

  const existingAssignment = await Building.findOne({
    designatedRepresentativeUserId: repUser._id,
    organizationalStatus: BuildingOrganizationalStatus.ACTIVE,
    buildingId: { $ne: input.buildingId },
  }).lean();

  if (existingAssignment) {
    throw new OrganizationError(
      OrganizationErrorCode.REP_ALREADY_ASSIGNED,
      "Representative is already assigned to another building",
    );
  }

  const previousId = building.designatedRepresentativeUserId?.toString();
  if (
    input.previousRepresentativeUserId &&
    previousId !== input.previousRepresentativeUserId
  ) {
    throw new OrganizationError(OrganizationErrorCode.CONFLICT, "Representative assignment stale");
  }

  await connectMongo();
  const session = await mongoose.startSession();
  const repObjectId = new Types.ObjectId(input.representativeUserId);

  try {
    await session.withTransaction(async () => {
      const updated = await Building.findOneAndUpdate(
        {
          buildingId: input.buildingId,
          organizationalStatus: BuildingOrganizationalStatus.ACTIVE,
          ...(input.previousRepresentativeUserId
            ? {
                designatedRepresentativeUserId: new Types.ObjectId(
                  input.previousRepresentativeUserId,
                ),
              }
            : {}),
        },
        { designatedRepresentativeUserId: repObjectId },
        { session, new: true },
      ).lean();

      if (!updated) {
        throw new OrganizationError(OrganizationErrorCode.CONFLICT, "Could not assign representative");
      }

      await recordRepresentativeAssigned({
        context: input.context,
        buildingId: input.buildingId,
        representativeUserId: input.representativeUserId,
        previousRepresentativeUserId: previousId,
        correlationId: input.correlationId,
        session,
      });
    });
  } catch (error) {
    mapAuditError(error);
  } finally {
    await session.endSession();
  }
}

export async function clearBuildingRepresentative(input: {
  context: AuthenticatedContext;
  buildingId: string;
  correlationId?: string;
}) {
  assertLawyerAdminOrganization(input.context);
  const building = await loadActiveBuilding(input.buildingId);
  const previousId = building.designatedRepresentativeUserId?.toString();
  if (!previousId) {
    return;
  }

  await connectMongo();
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await Building.findOneAndUpdate(
        { buildingId: input.buildingId },
        { designatedRepresentativeUserId: null },
        { session },
      );
      await recordRepresentativeRemoved({
        context: input.context,
        buildingId: input.buildingId,
        representativeUserId: previousId,
        correlationId: input.correlationId,
        session,
      });
    });
  } catch (error) {
    mapAuditError(error);
  } finally {
    await session.endSession();
  }
}

export async function linkBuildingToManagementCompany(input: {
  context: AuthenticatedContext;
  buildingId: string;
  managementCompanyId: string;
  correlationId?: string;
}) {
  assertLawyerAdminOrganization(input.context);
  const parsed = parseOrganizationInput(linkManagementCompanyToBuildingSchema, {
    buildingId: input.buildingId,
    managementCompanyId: input.managementCompanyId,
  });
  await loadActiveBuilding(parsed.buildingId);
  const company = await ManagementCompany.findOne({
    managementCompanyId: parsed.managementCompanyId,
  }).lean();
  if (!company) {
    throw new OrganizationError(OrganizationErrorCode.NOT_FOUND, "Management company not found");
  }
  if (company.status !== ManagementCompanyStatus.ACTIVE) {
    throw new OrganizationError(
      OrganizationErrorCode.MANAGEMENT_COMPANY_INACTIVE,
      "Management company is not active",
    );
  }

  await connectMongo();
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await Building.findOneAndUpdate(
        { buildingId: parsed.buildingId },
        { managementCompanyId: company._id },
        { session },
      );
      await recordManagementCompanyLinked({
        context: input.context,
        buildingId: parsed.buildingId,
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
}

export async function unlinkBuildingFromManagementCompany(input: {
  context: AuthenticatedContext;
  buildingId: string;
  managementCompanyId: string;
  correlationId?: string;
}) {
  assertLawyerAdminOrganization(input.context);
  const parsed = parseOrganizationInput(linkManagementCompanyToBuildingSchema, {
    buildingId: input.buildingId,
    managementCompanyId: input.managementCompanyId,
  });
  const building = await loadActiveBuilding(parsed.buildingId);
  const company = await ManagementCompany.findOne({
    managementCompanyId: parsed.managementCompanyId,
  }).lean();
  if (!company) {
    throw new OrganizationError(OrganizationErrorCode.NOT_FOUND, "Management company not found");
  }
  if (!building.managementCompanyId?.equals(company._id)) {
    throw new OrganizationError(OrganizationErrorCode.CONFLICT, "Building is not linked to company");
  }

  await connectMongo();
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await Building.findOneAndUpdate(
        { buildingId: parsed.buildingId, managementCompanyId: company._id },
        { managementCompanyId: null },
        { session },
      );
      await recordManagementCompanyUnlinked({
        context: input.context,
        buildingId: parsed.buildingId,
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
}
