import "server-only";

import mongoose from "mongoose";

import {
  OrganizationError,
  OrganizationErrorCode,
} from "@/modules/buildings/domain/organization-errors";
import { Building } from "@/modules/buildings/infra/building.model";
import {
  updateBuildingTreatmentFeeEligibilitySchema,
  type UpdateBuildingTreatmentFeeEligibilityInput,
} from "@/modules/buildings/validation/building.schema";
import { recordBuildingTreatmentFeeEligibilityChanged } from "@/modules/organizations/services/organization-audit.service";
import { assertLawyerAdminOrganization } from "@/modules/organizations/services/assert-lawyer-admin";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import { AuditWriteFailedError } from "@/shared/audit/errors/audit-errors";
import { connectMongo } from "@/shared/db/connect";

/**
 * Optimistic lock filter: legacy buildings may omit `treatmentFeeEligible` (semantic false).
 * MongoDB `{ treatmentFeeEligible: false }` does not match missing fields.
 */
export function buildTreatmentFeeEligibleConcurrencyFilter(
  buildingId: string,
  expectedEligible: boolean,
): Record<string, unknown> {
  if (expectedEligible) {
    return { buildingId, treatmentFeeEligible: true };
  }
  return {
    buildingId,
    $or: [{ treatmentFeeEligible: false }, { treatmentFeeEligible: { $exists: false } }],
  };
}

function mapAuditError(error: unknown): never {
  if (error instanceof AuditWriteFailedError) {
    throw new OrganizationError(
      OrganizationErrorCode.AUDIT_PERSISTENCE,
      "Treatment fee eligibility change could not be recorded",
    );
  }
  throw error;
}

export type BuildingTreatmentFeeEligibilityUpdateResult = {
  buildingId: string;
  treatmentFeeEligible: boolean;
  changed: boolean;
  treatmentFeeEligibleUpdatedAt: Date | null;
};

export async function updateBuildingTreatmentFeeEligibility(input: {
  context: AuthenticatedContext;
  payload: UpdateBuildingTreatmentFeeEligibilityInput;
  correlationId?: string;
}): Promise<BuildingTreatmentFeeEligibilityUpdateResult> {
  assertLawyerAdminOrganization(input.context);
  const parsed = updateBuildingTreatmentFeeEligibilitySchema.parse(input.payload);

  await connectMongo();
  const row = await Building.findOne({ buildingId: parsed.buildingId })
    .select("treatmentFeeEligible")
    .lean();
  if (!row) {
    throw new OrganizationError(OrganizationErrorCode.NOT_FOUND, "Building not found");
  }

  const current = Boolean(row.treatmentFeeEligible);
  if (current === parsed.treatmentFeeEligible) {
    return {
      buildingId: parsed.buildingId,
      treatmentFeeEligible: current,
      changed: false,
      treatmentFeeEligibleUpdatedAt: null,
    };
  }

  if (current !== parsed.expectedTreatmentFeeEligible) {
    throw new OrganizationError(
      OrganizationErrorCode.CONFLICT,
      "Treatment fee eligibility was updated elsewhere",
    );
  }

  const now = new Date();
  const actorId = new mongoose.Types.ObjectId(input.context.user.id);
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const updateResult = await Building.updateOne(
        buildTreatmentFeeEligibleConcurrencyFilter(
          parsed.buildingId,
          parsed.expectedTreatmentFeeEligible,
        ),
        {
          $set: {
            treatmentFeeEligible: parsed.treatmentFeeEligible,
            treatmentFeeEligibleUpdatedAt: now,
            treatmentFeeEligibleUpdatedByUserId: actorId,
          },
        },
        { session },
      );

      if (updateResult.modifiedCount !== 1) {
        throw new OrganizationError(
          OrganizationErrorCode.CONFLICT,
          "Treatment fee eligibility concurrent update",
        );
      }

      await recordBuildingTreatmentFeeEligibilityChanged({
        context: input.context,
        buildingId: parsed.buildingId,
        previousEligible: parsed.expectedTreatmentFeeEligible,
        nextEligible: parsed.treatmentFeeEligible,
        correlationId: input.correlationId,
        session,
      });
    });
  } catch (error) {
    if (error instanceof OrganizationError) {
      throw error;
    }
    mapAuditError(error);
  } finally {
    await session.endSession();
  }

  return {
    buildingId: parsed.buildingId,
    treatmentFeeEligible: parsed.treatmentFeeEligible,
    changed: true,
    treatmentFeeEligibleUpdatedAt: now,
  };
}
