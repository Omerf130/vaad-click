import "server-only";

import { randomUUID } from "node:crypto";

import mongoose from "mongoose";

import {
  OrganizationError,
  OrganizationErrorCode,
} from "@/modules/buildings/domain/organization-errors";
import { normalizeBuildingAddressKey } from "@/modules/buildings/domain/normalize-building-address";
import { BuildingOrganizationalStatus } from "@/modules/buildings/domain/building-status";
import { Building } from "@/modules/buildings/infra/building.model";
import {
  createBuildingInputSchema,
  type CreateBuildingInput,
} from "@/modules/buildings/validation/building.schema";
import { assertLawyerAdminOrganization } from "@/modules/organizations/services/assert-lawyer-admin";
import {
  recordBuildingArchived,
  recordBuildingCreated,
  recordBuildingUpdated,
  recordDuplicateAddressException,
} from "@/modules/organizations/services/organization-audit.service";
import {
  updateBuildingInputSchema,
  type UpdateBuildingInput,
} from "@/modules/buildings/validation/building.schema";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import { AuditWriteFailedError } from "@/shared/audit/errors/audit-errors";
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

export async function createBuildingRecord(input: {
  context: AuthenticatedContext;
  payload: CreateBuildingInput;
  correlationId?: string;
}) {
  assertLawyerAdminOrganization(input.context);
  const parsed = createBuildingInputSchema.parse(input.payload);
  const normalizedAddressKey = normalizeBuildingAddressKey(parsed.address);

  await connectMongo();
  const existing = await Building.findOne({
    normalizedAddressKey,
    organizationalStatus: BuildingOrganizationalStatus.ACTIVE,
    duplicateException: null,
  }).lean();

  if (existing && !parsed.duplicateAddressExceptionReason) {
    throw new OrganizationError(
      OrganizationErrorCode.DUPLICATE_ADDRESS,
      "A building with this address already exists",
    );
  }

  const buildingId = randomUUID();
  const session = await mongoose.startSession();
  const now = new Date();

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
            unitCount: parsed.unitCount ?? null,
            averageMonthlyVaadFeeMinor: parsed.averageMonthlyVaadFeeMinor ?? null,
            createdByUserId: new mongoose.Types.ObjectId(input.context.user.id),
            duplicateException: parsed.duplicateAddressExceptionReason
              ? {
                  acknowledgedAt: now,
                  acknowledgedByUserId: new mongoose.Types.ObjectId(input.context.user.id),
                  reasonInternal: parsed.duplicateAddressExceptionReason,
                }
              : null,
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

      if (parsed.duplicateAddressExceptionReason) {
        await recordDuplicateAddressException({
          context: input.context,
          buildingId,
          normalizedAddressKey,
          correlationId: input.correlationId,
          session,
        });
      }
    });
  } catch (error) {
    mapAuditError(error);
  } finally {
    await session.endSession();
  }

  return Building.findOne({ buildingId }).lean();
}

async function assertNoDuplicateAddressConflict(input: {
  normalizedAddressKey: string;
  excludeBuildingId: string;
  duplicateAddressExceptionReason?: string;
}) {
  const existing = await Building.findOne({
    normalizedAddressKey: input.normalizedAddressKey,
    organizationalStatus: BuildingOrganizationalStatus.ACTIVE,
    duplicateException: null,
    buildingId: { $ne: input.excludeBuildingId },
  }).lean();

  if (existing && !input.duplicateAddressExceptionReason) {
    throw new OrganizationError(
      OrganizationErrorCode.DUPLICATE_ADDRESS,
      "A building with this address already exists",
    );
  }
}

export async function updateBuildingRecord(input: {
  context: AuthenticatedContext;
  payload: UpdateBuildingInput;
  correlationId?: string;
}) {
  assertLawyerAdminOrganization(input.context);
  const parsed = updateBuildingInputSchema.parse(input.payload);

  await connectMongo();
  const building = await Building.findOne({ buildingId: parsed.buildingId }).lean();
  if (!building) {
    throw new OrganizationError(OrganizationErrorCode.NOT_FOUND, "Building not found");
  }

  const normalizedAddressKey = normalizeBuildingAddressKey(parsed.address);
  const addressChanged = normalizedAddressKey !== building.normalizedAddressKey;

  if (addressChanged) {
    await assertNoDuplicateAddressConflict({
      normalizedAddressKey,
      excludeBuildingId: parsed.buildingId,
      duplicateAddressExceptionReason: parsed.duplicateAddressExceptionReason,
    });
  }

  const session = await mongoose.startSession();
  const now = new Date();

  try {
    await session.withTransaction(async () => {
      await Building.findOneAndUpdate(
        { buildingId: parsed.buildingId },
        {
          displayName: parsed.displayName,
          address: parsed.address,
          normalizedAddressKey,
          unitCount: parsed.unitCount ?? null,
          averageMonthlyVaadFeeMinor: parsed.averageMonthlyVaadFeeMinor ?? null,
          ...(addressChanged && parsed.duplicateAddressExceptionReason
            ? {
                duplicateException: {
                  acknowledgedAt: now,
                  acknowledgedByUserId: new mongoose.Types.ObjectId(input.context.user.id),
                  reasonInternal: parsed.duplicateAddressExceptionReason,
                },
              }
            : {}),
        },
        { session },
      );

      await recordBuildingUpdated({
        context: input.context,
        buildingId: parsed.buildingId,
        correlationId: input.correlationId,
        session,
      });

      if (addressChanged && parsed.duplicateAddressExceptionReason) {
        await recordDuplicateAddressException({
          context: input.context,
          buildingId: parsed.buildingId,
          normalizedAddressKey,
          correlationId: input.correlationId,
          session,
        });
      }
    });
  } catch (error) {
    mapAuditError(error);
  } finally {
    await session.endSession();
  }

  return Building.findOne({ buildingId: parsed.buildingId }).lean();
}

export async function archiveBuildingRecord(input: {
  context: AuthenticatedContext;
  buildingId: string;
  correlationId?: string;
}) {
  assertLawyerAdminOrganization(input.context);
  await connectMongo();

  const building = await Building.findOne({ buildingId: input.buildingId }).lean();
  if (!building) {
    throw new OrganizationError(OrganizationErrorCode.NOT_FOUND, "Building not found");
  }
  if (building.organizationalStatus === BuildingOrganizationalStatus.ARCHIVED) {
    return building;
  }

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await Building.findOneAndUpdate(
        { buildingId: input.buildingId },
        {
          organizationalStatus: BuildingOrganizationalStatus.ARCHIVED,
          archivedAt: new Date(),
        },
        { session },
      );
      await recordBuildingArchived({
        context: input.context,
        buildingId: input.buildingId,
        correlationId: input.correlationId,
        session,
      });
    });
  } catch (error) {
    mapAuditError(error);
  } finally {
    await session.endSession();
  }

  return Building.findOne({ buildingId: input.buildingId }).lean();
}
