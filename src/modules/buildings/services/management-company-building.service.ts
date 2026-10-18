import "server-only";

import { randomUUID } from "node:crypto";

import mongoose from "mongoose";

import {
  OrganizationError,
  OrganizationErrorCode,
} from "@/modules/buildings/domain/organization-errors";
import { normalizeBuildingAddressKey } from "@/modules/buildings/domain/normalize-building-address";
import {
  BuildingOrganizationalStatus,
  LawyerVerificationStatus,
} from "@/modules/buildings/domain/building-status";
import { Building } from "@/modules/buildings/infra/building.model";
import {
  managementCompanyCreateBuildingInputSchema,
  type ManagementCompanyCreateBuildingInput,
} from "@/modules/buildings/validation/building.schema";
import { resolveActiveManagementCompanyForUser } from "@/modules/organizations/services/resolve-management-company-for-user";
import {
  recordBuildingCreated,
  recordManagementCompanyLinked,
} from "@/modules/organizations/services/organization-audit.service";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import { AuditWriteFailedError } from "@/shared/audit/errors/audit-errors";
import {
  notifyLawyerAdminsBuildingCreatedByMc,
  notifyMcBuildingRecorded,
} from "@/modules/notifications/services/notification-dispatch.service";
import { connectMongo } from "@/shared/db/connect";

function mapAuditError(error: unknown): never {
  if (error instanceof AuditWriteFailedError) {
    throw new OrganizationError(
      OrganizationErrorCode.AUDIT_PERSISTENCE,
      "Building change could not be recorded",
    );
  }
  throw error;
}

export async function createBuildingForManagementCompany(input: {
  context: AuthenticatedContext;
  payload: ManagementCompanyCreateBuildingInput;
  correlationId?: string;
}): Promise<{ buildingId: string }> {
  const company = await resolveActiveManagementCompanyForUser(input.context);
  const parsed = managementCompanyCreateBuildingInputSchema.parse(input.payload);
  const normalizedAddressKey = normalizeBuildingAddressKey(parsed.address);

  await connectMongo();
  const existing = await Building.findOne({
    normalizedAddressKey,
    organizationalStatus: BuildingOrganizationalStatus.ACTIVE,
    duplicateException: null,
  }).lean();

  if (existing) {
    throw new OrganizationError(
      OrganizationErrorCode.DUPLICATE_ADDRESS,
      "A building with this address already exists",
    );
  }

  const buildingId = randomUUID();
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      await Building.create(
        [
          {
            buildingId,
            displayName: parsed.displayName,
            address: parsed.address,
            normalizedAddressKey,
            organizationalStatus: BuildingOrganizationalStatus.ACTIVE,
            lawyerVerificationStatus: LawyerVerificationStatus.NOT_STARTED,
            managementCompanyId: company.managementCompanyObjectId,
            unitCount: null,
            averageMonthlyVaadFeeMinor: null,
            createdByUserId: new mongoose.Types.ObjectId(input.context.user.id),
            duplicateException: null,
          },
        ],
        { session },
      );

      await recordBuildingCreated({
        context: input.context,
        buildingId,
        correlationId: input.correlationId,
        session,
      });

      await recordManagementCompanyLinked({
        context: input.context,
        buildingId,
        managementCompanyId: company.managementCompanyId,
        correlationId: input.correlationId,
        session,
      });

      await notifyLawyerAdminsBuildingCreatedByMc({
        buildingId,
        buildingDisplayName: parsed.displayName,
        managementCompanyObjectId: company.managementCompanyObjectId,
        session,
      });
      await notifyMcBuildingRecorded({
        buildingId,
        buildingDisplayName: parsed.displayName,
        managementCompanyObjectId: company.managementCompanyObjectId,
        session,
      });
    });
  } catch (error) {
    mapAuditError(error);
  } finally {
    await session.endSession();
  }

  return { buildingId };
}
