import "server-only";

import mongoose, { Types } from "mongoose";

import { normalizeBuildingAddressKey } from "@/modules/buildings/domain/normalize-building-address";
import {
  BuildingOrganizationalStatus,
  LawyerVerificationStatus,
} from "@/modules/buildings/domain/building-status";
import { Building } from "@/modules/buildings/infra/building.model";
import { managementCompanyCreateBuildingInputSchema } from "@/modules/buildings/validation/building.schema";
import { PendingBuildingOnboardingStatus } from "@/modules/debt-cases/domain/pending-building-onboarding-status";
import { PendingBuildingOnboardingRequest } from "@/modules/debt-cases/infra/pending-building-onboarding-request.model";
import { ensureManagementCompanyForIntakeUser } from "@/modules/organizations/services/management-company-intake-provision.service";
import { recordBuildingCreated } from "@/modules/organizations/services/organization-audit.service";
import { isClientApproved } from "@/modules/users/domain/client-portal-access";
import { UserRole } from "@/modules/users/domain/user-role";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import { assertBuildingAccess } from "@/shared/auth/building-access/assert-building-access";
import { connectMongo } from "@/shared/db/connect";
import { randomUUID } from "node:crypto";

export type IntakeBuildingResolution =
  | { outcome: "ready"; buildingId: string }
  | { outcome: "collision" }
  | { outcome: "forbidden"; message: string };

async function userHasBuildingInScope(
  context: AuthenticatedContext,
  buildingId: string,
): Promise<boolean> {
  try {
    await assertBuildingAccess({ context, buildingPublicId: buildingId });
    return true;
  } catch {
    return false;
  }
}

export async function detectIntakeAddressCollision(input: {
  context: AuthenticatedContext;
  normalizedAddressKey: string;
}): Promise<{ collision: boolean; authorizedBuildingId?: string }> {
  await connectMongo();
  const existing = await Building.findOne({
    normalizedAddressKey: input.normalizedAddressKey,
    organizationalStatus: BuildingOrganizationalStatus.ACTIVE,
    duplicateException: null,
  }).lean();
  if (!existing) {
    return { collision: false };
  }
  if (await userHasBuildingInScope(input.context, existing.buildingId)) {
    return { collision: false, authorizedBuildingId: existing.buildingId };
  }
  return { collision: true };
}

export async function resolveRepAssignedBuilding(
  context: AuthenticatedContext,
): Promise<string | null> {
  if (context.user.role !== UserRole.BUILDING_REP) {
    return null;
  }
  await connectMongo();
  const building = await Building.findOne({
    designatedRepresentativeUserId: new Types.ObjectId(context.user.id),
    organizationalStatus: BuildingOrganizationalStatus.ACTIVE,
  })
    .select("buildingId")
    .lean();
  return building?.buildingId ?? null;
}

export async function provisionBuildingForIntakeSubmit(input: {
  context: AuthenticatedContext;
  buildingPayload: { displayName: string; address: { city: string; street: string; houseNumber: string; postalCode?: string } };
  correlationId?: string;
  session: mongoose.ClientSession;
}): Promise<IntakeBuildingResolution> {
  const parsed = managementCompanyCreateBuildingInputSchema.parse(input.buildingPayload);
  const normalizedAddressKey = normalizeBuildingAddressKey(parsed.address);
  const collision = await detectIntakeAddressCollision({
    context: input.context,
    normalizedAddressKey,
  });
  if (collision.collision) {
    return { outcome: "collision" };
  }
  if (collision.authorizedBuildingId) {
    return { outcome: "ready", buildingId: collision.authorizedBuildingId };
  }

  const userObjectId = new Types.ObjectId(input.context.user.id);

  if (input.context.user.role === UserRole.BUILDING_REP) {
    const existingRepBuilding = await Building.findOne({
      designatedRepresentativeUserId: userObjectId,
      organizationalStatus: BuildingOrganizationalStatus.ACTIVE,
    })
      .session(input.session)
      .lean();
    if (existingRepBuilding) {
      return { outcome: "forbidden", message: "Representative already has a building" };
    }

    const buildingId = randomUUID();
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
      { session: input.session },
    );

    await PendingBuildingOnboardingRequest.updateMany(
      { userId: userObjectId, status: PendingBuildingOnboardingStatus.OPEN },
      { $set: { status: PendingBuildingOnboardingStatus.BOUND, buildingId } },
      { session: input.session },
    );

    await recordBuildingCreated({
      context: input.context,
      buildingId,
      correlationId: input.correlationId,
      session: input.session,
    });

    return { outcome: "ready", buildingId };
  }

  if (input.context.user.role === UserRole.MANAGEMENT_COMPANY) {
    const company = await ensureManagementCompanyForIntakeUser({
      context: input.context,
      correlationId: input.correlationId,
      session: input.session,
    });

    const assignedBuildingCount = await Building.countDocuments({
      managementCompanyId: company.managementCompanyObjectId,
      organizationalStatus: BuildingOrganizationalStatus.ACTIVE,
    }).session(input.session);

    if (!isClientApproved(input.context.user) && assignedBuildingCount > 0) {
      return { outcome: "forbidden", message: "Additional buildings require client approval" };
    }

    const buildingId = randomUUID();
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
          createdByUserId: userObjectId,
          duplicateException: null,
        },
      ],
      { session: input.session },
    );

    await recordBuildingCreated({
      context: input.context,
      buildingId,
      correlationId: input.correlationId,
      session: input.session,
    });

    const { notifyLawyerAdminsBuildingCreatedByMc } = await import(
      "@/modules/notifications/services/notification-dispatch.service"
    );
    if (isClientApproved(input.context.user)) {
      await notifyLawyerAdminsBuildingCreatedByMc({
        buildingId,
        buildingDisplayName: parsed.displayName,
        managementCompanyObjectId: company.managementCompanyObjectId,
        session: input.session,
      });
    }

    return { outcome: "ready", buildingId };
  }

  return { outcome: "forbidden", message: "Unsupported role" };
}

export async function resolveBuildingIdForIntakeSubmit(input: {
  context: AuthenticatedContext;
  building:
    | { mode: "existing"; buildingId: string }
    | { mode: "new"; displayName: string; address: { city: string; street: string; houseNumber: string; postalCode?: string } };
  correlationId?: string;
  session: mongoose.ClientSession;
}): Promise<IntakeBuildingResolution> {
  const repAssigned = await resolveRepAssignedBuilding(input.context);
  if (repAssigned) {
    if (input.building.mode === "existing" && input.building.buildingId !== repAssigned) {
      return { outcome: "forbidden", message: "Building mismatch" };
    }
    return { outcome: "ready", buildingId: repAssigned };
  }

  if (input.building.mode === "existing") {
    if (!(await userHasBuildingInScope(input.context, input.building.buildingId))) {
      return { outcome: "forbidden", message: "Building access denied" };
    }
    return { outcome: "ready", buildingId: input.building.buildingId };
  }

  return provisionBuildingForIntakeSubmit({
    context: input.context,
    buildingPayload: {
      displayName: input.building.displayName,
      address: input.building.address,
    },
    correlationId: input.correlationId,
    session: input.session,
  });
}
