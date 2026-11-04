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
import { managementCompanyCreateBuildingInputSchema } from "@/modules/buildings/validation/building.schema";
import { PendingBuildingOnboardingStatus } from "@/modules/debt-cases/domain/pending-building-onboarding-status";
import { PendingBuildingOnboardingRequest } from "@/modules/debt-cases/infra/pending-building-onboarding-request.model";
import { canAccessOperatorPortal } from "@/modules/users/domain/client-portal-access";
import { UserRole } from "@/modules/users/domain/user-role";
import { recordBuildingCreated } from "@/modules/organizations/services/organization-audit.service";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import { connectMongo } from "@/shared/db/connect";

export async function provisionNewBuildingForBuildingRepresentative(input: {
  context: AuthenticatedContext;
  payload: unknown;
  correlationId?: string;
}): Promise<{ buildingId: string }> {
  if (input.context.user.role !== UserRole.BUILDING_REP) {
    throw new OrganizationError(OrganizationErrorCode.FORBIDDEN, "Building rep only");
  }
  if (!canAccessOperatorPortal(input.context.user)) {
    throw new OrganizationError(OrganizationErrorCode.FORBIDDEN, "Account not eligible");
  }

  const parsed = managementCompanyCreateBuildingInputSchema.parse(input.payload);
  const normalizedAddressKey = normalizeBuildingAddressKey(parsed.address);
  await connectMongo();

  const existingRepBuilding = await Building.findOne({
    designatedRepresentativeUserId: new mongoose.Types.ObjectId(input.context.user.id),
    organizationalStatus: BuildingOrganizationalStatus.ACTIVE,
  }).lean();
  if (existingRepBuilding) {
    throw new OrganizationError(
      OrganizationErrorCode.REP_ALREADY_ASSIGNED,
      "Representative already has a building",
    );
  }

  const existingAtAddress = await Building.findOne({
    normalizedAddressKey,
    organizationalStatus: BuildingOrganizationalStatus.ACTIVE,
    duplicateException: null,
  }).lean();

  if (existingAtAddress) {
    throw new OrganizationError(
      OrganizationErrorCode.DUPLICATE_ADDRESS,
      "Building address collision — lawyer review required",
    );
  }

  const buildingId = randomUUID();
  const userObjectId = new mongoose.Types.ObjectId(input.context.user.id);
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
            designatedRepresentativeUserId: userObjectId,
            managementCompanyId: null,
            unitCount: null,
            averageMonthlyVaadFeeMinor: null,
            createdByUserId: userObjectId,
            duplicateException: null,
          },
        ],
        { session },
      );

      await PendingBuildingOnboardingRequest.updateMany(
        {
          userId: userObjectId,
          status: PendingBuildingOnboardingStatus.OPEN,
        },
        {
          $set: {
            status: PendingBuildingOnboardingStatus.BOUND,
            buildingId,
          },
        },
        { session },
      );

      await recordBuildingCreated({
        context: input.context,
        buildingId,
        correlationId: input.correlationId,
        session,
      });
    });
  } finally {
    await session.endSession();
  }

  return { buildingId };
}
