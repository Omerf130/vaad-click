import "server-only";

import { randomUUID } from "node:crypto";

import mongoose, { Types } from "mongoose";

import { PendingBuildingOnboardingStatus } from "@/modules/debt-cases/domain/pending-building-onboarding-status";
import { DebtCaseError, DebtCaseErrorCode } from "@/modules/debt-cases/domain/debt-case-errors";
import { PendingBuildingOnboardingRequest } from "@/modules/debt-cases/infra/pending-building-onboarding-request.model";
import { BuildingOrganizationalStatus } from "@/modules/buildings/domain/building-status";
import { Building } from "@/modules/buildings/infra/building.model";
import { assertLawyerAdminOrganization } from "@/modules/organizations/services/assert-lawyer-admin";
import { recordPendingOnboardingBound } from "@/modules/organizations/services/organization-audit.service";
import { AccountStatus } from "@/modules/users/domain/account-status";
import { User } from "@/modules/users/infra/user.model";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import { AuditWriteFailedError } from "@/shared/audit/errors/audit-errors";
import { isWellFormedBuildingPublicId } from "@/shared/auth/building-access/building-public-id";
import { connectMongo } from "@/shared/db/connect";

export type PendingOnboardingContext = {
  onboardingRequestId: string;
  buildingId: string;
};

function mapAuditError(error: unknown): never {
  if (error instanceof AuditWriteFailedError) {
    throw new DebtCaseError(
      DebtCaseErrorCode.AUDIT_PERSISTENCE,
      "Onboarding bind could not be recorded",
    );
  }
  throw error;
}

export function buildPendingOnboardingConcurrencyFilter(input: {
  onboardingRequestId: string;
  targetUserId: string;
  expectedOnboardingStatus: PendingBuildingOnboardingStatus;
  expectedBoundBuildingId: string | null;
}): Record<string, unknown> {
  const userObjectId = new Types.ObjectId(input.targetUserId);
  if (input.expectedOnboardingStatus === PendingBuildingOnboardingStatus.OPEN) {
    return {
      onboardingRequestId: input.onboardingRequestId,
      userId: userObjectId,
      status: PendingBuildingOnboardingStatus.OPEN,
    };
  }
  return {
    onboardingRequestId: input.onboardingRequestId,
    userId: userObjectId,
    status: PendingBuildingOnboardingStatus.BOUND,
    buildingId: input.expectedBoundBuildingId,
  };
}

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
  targetUserId: string;
  onboardingRequestId: string;
  buildingId: string;
  expectedOnboardingStatus: PendingBuildingOnboardingStatus;
  expectedBoundBuildingId?: string | null;
  correlationId?: string;
}): Promise<{ changed: boolean }> {
  assertLawyerAdminOrganization(input.context);
  if (!Types.ObjectId.isValid(input.targetUserId)) {
    throw new DebtCaseError(DebtCaseErrorCode.VALIDATION, "Invalid user id");
  }
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
    userId: new Types.ObjectId(input.targetUserId),
    status: { $in: [PendingBuildingOnboardingStatus.OPEN, PendingBuildingOnboardingStatus.BOUND] },
  }).lean();

  if (!request) {
    throw new DebtCaseError(DebtCaseErrorCode.NOT_FOUND, "Onboarding request not found");
  }

  const currentBuildingId = request.buildingId ?? null;
  if (
    request.status === PendingBuildingOnboardingStatus.BOUND &&
    currentBuildingId === input.buildingId
  ) {
    return { changed: false };
  }

  const expectedBoundBuildingId =
    input.expectedOnboardingStatus === PendingBuildingOnboardingStatus.BOUND
      ? (input.expectedBoundBuildingId ?? currentBuildingId)
      : null;

  if (
    request.status !== input.expectedOnboardingStatus ||
    (request.status === PendingBuildingOnboardingStatus.BOUND &&
      currentBuildingId !== expectedBoundBuildingId)
  ) {
    throw new DebtCaseError(
      DebtCaseErrorCode.FORBIDDEN,
      "Onboarding request state changed elsewhere",
    );
  }

  const now = new Date();
  const actorId = new Types.ObjectId(input.context.user.id);
  const session = await mongoose.startSession();
  const previousBuildingId = currentBuildingId;

  try {
    await session.withTransaction(async () => {
      const filter = buildPendingOnboardingConcurrencyFilter({
        onboardingRequestId: input.onboardingRequestId,
        targetUserId: input.targetUserId,
        expectedOnboardingStatus: input.expectedOnboardingStatus,
        expectedBoundBuildingId,
      });

      const updateResult = await PendingBuildingOnboardingRequest.updateOne(
        filter,
        {
          $set: {
            status: PendingBuildingOnboardingStatus.BOUND,
            buildingId: input.buildingId,
            boundAt: now,
            boundByUserId: actorId,
          },
        },
        { session },
      );

      if (updateResult.modifiedCount !== 1) {
        throw new DebtCaseError(
          DebtCaseErrorCode.FORBIDDEN,
          "Onboarding concurrent update conflict",
        );
      }

      await recordPendingOnboardingBound({
        context: input.context,
        targetUserId: input.targetUserId,
        onboardingRequestId: input.onboardingRequestId,
        buildingId: input.buildingId,
        previousBuildingId,
        correlationId: input.correlationId,
        session,
      });
    });
  } catch (error) {
    if (error instanceof DebtCaseError) {
      throw error;
    }
    mapAuditError(error);
  } finally {
    await session.endSession();
  }

  return { changed: true };
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
