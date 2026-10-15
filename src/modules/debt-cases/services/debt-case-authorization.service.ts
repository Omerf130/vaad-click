import "server-only";

import { Types } from "mongoose";

import { DebtCaseError, DebtCaseErrorCode } from "@/modules/debt-cases/domain/debt-case-errors";
import { isLawyerAdminActor, type DebtCaseActorContext } from "@/modules/debt-cases/domain/debt-case-actor";
import { DebtCaseWorkflowStatus } from "@/modules/debt-cases/domain/debt-case-workflow-status";
import type { DebtCaseDocument } from "@/modules/debt-cases/infra/debt-case.model";
import { resolvePendingOnboardingBuildingForUser } from "@/modules/debt-cases/services/pending-building-onboarding.service";
import { AccountStatus } from "@/modules/users/domain/account-status";
import { UserRole } from "@/modules/users/domain/user-role";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import { assertBuildingAccess } from "@/shared/auth/building-access/assert-building-access";
import { connectMongo } from "@/shared/db/connect";

function debtCaseActorFromContext(context: AuthenticatedContext): DebtCaseActorContext {
  return {
    role: context.user.role,
    accountStatus: context.user.accountStatus,
  };
}

export function assertDebtCaseAccountEligible(context: AuthenticatedContext): void {
  const { accountStatus } = context.user;
  if (
    accountStatus === AccountStatus.REJECTED ||
    accountStatus === AccountStatus.DISABLED ||
    accountStatus === AccountStatus.LOCKED
  ) {
    throw new DebtCaseError(DebtCaseErrorCode.FORBIDDEN, "Account cannot access debt cases");
  }
}

export async function resolveAuthorizedBuildingIdForDraftCreate(input: {
  context: AuthenticatedContext;
  clientBuildingId?: string | null;
}): Promise<{ buildingId: string; pendingOnboardingRequestId: string | null }> {
  assertDebtCaseAccountEligible(input.context);

  if (isLawyerAdminActor(debtCaseActorFromContext(input.context))) {
    if (!input.clientBuildingId) {
      throw new DebtCaseError(DebtCaseErrorCode.VALIDATION, "Building id required");
    }
    await assertBuildingAccess({
      context: input.context,
      buildingPublicId: input.clientBuildingId,
    });
    return { buildingId: input.clientBuildingId, pendingOnboardingRequestId: null };
  }

  if (input.context.user.accountStatus === AccountStatus.PENDING_APPROVAL) {
    if (input.clientBuildingId) {
      throw new DebtCaseError(
        DebtCaseErrorCode.FORBIDDEN,
        "Pending accounts cannot specify a building id",
      );
    }
    await connectMongo();
    const onboarding = await resolvePendingOnboardingBuildingForUser(input.context.user.id);
    if (!onboarding) {
      throw new DebtCaseError(
        DebtCaseErrorCode.ONBOARDING_NOT_READY,
        "Pending onboarding building is not bound yet",
      );
    }
    return {
      buildingId: onboarding.buildingId,
      pendingOnboardingRequestId: onboarding.onboardingRequestId,
    };
  }

  if (input.context.user.accountStatus !== AccountStatus.ACTIVE) {
    throw new DebtCaseError(DebtCaseErrorCode.FORBIDDEN, "Account cannot create debt cases");
  }

  if (!input.clientBuildingId) {
    throw new DebtCaseError(DebtCaseErrorCode.VALIDATION, "Building id required");
  }
  await assertBuildingAccess({
    context: input.context,
    buildingPublicId: input.clientBuildingId,
  });
  return { buildingId: input.clientBuildingId, pendingOnboardingRequestId: null };
}

export async function assertCanReadDebtCase(input: {
  context: AuthenticatedContext;
  doc: DebtCaseDocument;
}): Promise<void> {
  assertDebtCaseAccountEligible(input.context);

  if (isLawyerAdminActor(debtCaseActorFromContext(input.context))) {
    return;
  }

  const userId = input.context.user.id;
  const isOwner = input.doc.createdByUserId.toString() === userId;

  if (input.context.user.accountStatus === AccountStatus.PENDING_APPROVAL) {
    if (
      !isOwner ||
      input.doc.workflowStatus !== DebtCaseWorkflowStatus.DRAFT
    ) {
      throw new DebtCaseError(DebtCaseErrorCode.FORBIDDEN, "Access denied");
    }
    const onboarding = await resolvePendingOnboardingBuildingForUser(userId);
    if (!onboarding || onboarding.buildingId !== input.doc.buildingId) {
      throw new DebtCaseError(DebtCaseErrorCode.FORBIDDEN, "Access denied");
    }
    return;
  }

  if (input.context.user.accountStatus !== AccountStatus.ACTIVE) {
    throw new DebtCaseError(DebtCaseErrorCode.FORBIDDEN, "Access denied");
  }

  await assertBuildingAccess({
    context: input.context,
    buildingPublicId: input.doc.buildingId,
  });
}

export async function assertCanMutateDebtCase(input: {
  context: AuthenticatedContext;
  doc: DebtCaseDocument;
}): Promise<void> {
  await assertCanReadDebtCase({ context: input.context, doc: input.doc });

  if (input.context.user.accountStatus === AccountStatus.PENDING_APPROVAL) {
    if (input.doc.workflowStatus !== DebtCaseWorkflowStatus.DRAFT) {
      throw new DebtCaseError(DebtCaseErrorCode.FORBIDDEN, "Pending accounts may edit drafts only");
    }
    return;
  }

  if (isLawyerAdminActor(debtCaseActorFromContext(input.context))) {
    return;
  }

  if (
    input.context.user.role !== UserRole.BUILDING_REP &&
    input.context.user.role !== UserRole.MANAGEMENT_COMPANY
  ) {
    throw new DebtCaseError(DebtCaseErrorCode.FORBIDDEN, "Access denied");
  }
}

export async function assertCanListBuildingDebtCases(input: {
  context: AuthenticatedContext;
  buildingId: string;
}): Promise<void> {
  assertDebtCaseAccountEligible(input.context);

  if (input.context.user.accountStatus === AccountStatus.PENDING_APPROVAL) {
    const onboarding = await resolvePendingOnboardingBuildingForUser(input.context.user.id);
    if (!onboarding || onboarding.buildingId !== input.buildingId) {
      throw new DebtCaseError(DebtCaseErrorCode.FORBIDDEN, "Access denied");
    }
    return;
  }

  await assertBuildingAccess({
    context: input.context,
    buildingPublicId: input.buildingId,
  });
}

export function buildPendingUserDraftListFilter(userId: string): Record<string, unknown> {
  return {
    createdByUserId: new Types.ObjectId(userId),
    workflowStatus: DebtCaseWorkflowStatus.DRAFT,
  };
}

export async function assertLawyerAdminDebtCaseReview(input: {
  context: AuthenticatedContext;
}): Promise<void> {
  assertDebtCaseAccountEligible(input.context);
  if (!isLawyerAdminActor(debtCaseActorFromContext(input.context))) {
    throw new DebtCaseError(DebtCaseErrorCode.FORBIDDEN, "Lawyer admin required");
  }
}
