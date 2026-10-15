import "server-only";

import { randomUUID } from "node:crypto";

import mongoose, { Types } from "mongoose";

import { PendingBuildingOnboardingStatus } from "@/modules/debt-cases/domain/pending-building-onboarding-status";
import { DebtCaseError, DebtCaseErrorCode } from "@/modules/debt-cases/domain/debt-case-errors";
import { PendingBuildingOnboardingRequest } from "@/modules/debt-cases/infra/pending-building-onboarding-request.model";
import { BuildingOrganizationalStatus } from "@/modules/buildings/domain/building-status";
import { Building } from "@/modules/buildings/infra/building.model";
import { assertLawyerAdminOrganization } from "@/modules/organizations/services/assert-lawyer-admin";
import { AccountStatus } from "@/modules/users/domain/account-status";
import { User } from "@/modules/users/infra/user.model";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import { isWellFormedBuildingPublicId } from "@/shared/auth/building-access/building-public-id";
import { connectMongo } from "@/shared/db/connect";

export type PendingOnboardingContext = {
  onboardingRequestId: string;
  buildingId: string;
};

/** Creates server-owned onboarding association (registration UI wires later). */
export async function createPendingBuildingOnboardingRequest(input: {
  targetUserId: string;
  createdByUserId: string;
  session?: mongoose.ClientSession;
}): Promise<{ onboardingRequestId: string }> {
  if (!Types.ObjectId.isValid(input.targetUserId)) {
    throw new DebtCaseError(DebtCaseErrorCode.VALIDATION, "Invalid user id");
  }

  await connectMongo();
  const user = await User.findById(input.targetUserId).lean();
  if (!user || user.accountStatus !== AccountStatus.PENDING_APPROVAL) {
    throw new DebtCaseError(
      DebtCaseErrorCode.FORBIDDEN,
      "Onboarding request requires a pending-approval account",
    );
  }

  const onboardingRequestId = randomUUID();
  await PendingBuildingOnboardingRequest.create(
    [
      {
        onboardingRequestId,
        userId: user._id,
        status: PendingBuildingOnboardingStatus.OPEN,
        buildingId: null,
        createdByUserId: new Types.ObjectId(input.createdByUserId),
      },
    ],
    input.session ? { session: input.session } : undefined,
  );

  return { onboardingRequestId };
}

/** Lawyer-admin binds an existing building to a pending user's onboarding request. */
export async function bindPendingOnboardingToBuilding(input: {
  context: AuthenticatedContext;
  onboardingRequestId: string;
  buildingId: string;
}): Promise<void> {
  assertLawyerAdminOrganization(input.context);
  if (!isWellFormedBuildingPublicId(input.buildingId)) {
    throw new DebtCaseError(DebtCaseErrorCode.VALIDATION, "Invalid building id");
  }

  await connectMongo();
  const building = await Building.findOne({
    buildingId: input.buildingId,
    organizationalStatus: BuildingOrganizationalStatus.ACTIVE,
  }).lean();
  if (!building) {
    throw new DebtCaseError(DebtCaseErrorCode.NOT_FOUND, "Building not found");
  }

  const request = await PendingBuildingOnboardingRequest.findOne({
    onboardingRequestId: input.onboardingRequestId,
    status: { $in: [PendingBuildingOnboardingStatus.OPEN, PendingBuildingOnboardingStatus.BOUND] },
  });
  if (!request) {
    throw new DebtCaseError(DebtCaseErrorCode.NOT_FOUND, "Onboarding request not found");
  }

  request.status = PendingBuildingOnboardingStatus.BOUND;
  request.buildingId = input.buildingId;
  request.boundAt = new Date();
  request.boundByUserId = new Types.ObjectId(input.context.user.id);
  await request.save();
}

/** Resolves bound building for pending user — never trusts client building id. */
export async function resolvePendingOnboardingBuildingForUser(
  userId: string,
): Promise<PendingOnboardingContext | null> {
  if (!Types.ObjectId.isValid(userId)) {
    return null;
  }
  await connectMongo();
  const request = await PendingBuildingOnboardingRequest.findOne({
    userId: new Types.ObjectId(userId),
    status: PendingBuildingOnboardingStatus.BOUND,
    buildingId: { $ne: null },
  }).lean();

  if (!request?.buildingId) {
    return null;
  }

  return {
    onboardingRequestId: request.onboardingRequestId,
    buildingId: request.buildingId,
  };
}

export async function closePendingOnboardingForUser(input: {
  userId: string;
  session?: mongoose.ClientSession;
}): Promise<void> {
  await PendingBuildingOnboardingRequest.updateMany(
    {
      userId: new Types.ObjectId(input.userId),
      status: { $in: [PendingBuildingOnboardingStatus.OPEN, PendingBuildingOnboardingStatus.BOUND] },
    },
    {
      $set: {
        status: PendingBuildingOnboardingStatus.CLOSED,
        closedAt: new Date(),
      },
    },
    input.session ? { session: input.session } : {},
  );
}
