import "server-only";

import mongoose, { Types } from "mongoose";

import { DebtCaseWorkflowStatus } from "@/modules/debt-cases/domain/debt-case-workflow-status";
import { DebtCase } from "@/modules/debt-cases/infra/debt-case.model";
import { AccountStatus } from "@/modules/users/domain/account-status";
import { ClientApprovalStatus } from "@/modules/users/domain/client-approval-status";
import {
  isClientApproved,
  resolveEffectiveClientApprovalStatus,
} from "@/modules/users/domain/client-portal-access";
import { User } from "@/modules/users/infra/user.model";
import {
  notifyLawyerAdminsAccountRegistrationPending,
} from "@/modules/notifications/services/notification-dispatch.service";
import { recordClientApprovalPendingOnFirstSubmission } from "@/modules/organizations/services/organization-audit.service";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import { connectMongo } from "@/shared/db/connect";

export async function markClientPendingLawyerApprovalOnFirstSubmit(input: {
  context: AuthenticatedContext;
  correlationId?: string;
  session?: mongoose.ClientSession;
}): Promise<{ changed: boolean }> {
  const userState = input.context.user;
  const effective = resolveEffectiveClientApprovalStatus(userState);
  if (effective === ClientApprovalStatus.APPROVED || effective === ClientApprovalStatus.REJECTED) {
    return { changed: false };
  }
  if (effective === ClientApprovalStatus.PENDING_LAWYER_APPROVAL) {
    return { changed: false };
  }

  await connectMongo();
  const userObjectId = new Types.ObjectId(userState.id);
  const submittedCount = await DebtCase.countDocuments({
    createdByUserId: userObjectId,
    workflowStatus: { $ne: DebtCaseWorkflowStatus.DRAFT },
  }).session(input.session ?? null);

  if (submittedCount > 1) {
    return { changed: false };
  }

  const updateOptions = input.session ? { session: input.session, new: true } : { new: true };
  const updated = await User.findOneAndUpdate(
    {
      _id: userObjectId,
      $or: [
        { clientApprovalStatus: ClientApprovalStatus.AWAITING_SUBMISSION },
        { clientApprovalStatus: { $exists: false } },
        { clientApprovalStatus: null },
        { accountStatus: AccountStatus.PENDING_APPROVAL },
      ],
    },
    {
      clientApprovalStatus: ClientApprovalStatus.PENDING_LAWYER_APPROVAL,
      accountStatus: AccountStatus.ACTIVE,
    },
    updateOptions,
  ).lean();

  if (!updated) {
    return { changed: false };
  }

  await recordClientApprovalPendingOnFirstSubmission({
    context: input.context,
    targetUserId: userState.id,
    correlationId: input.correlationId,
    session: input.session,
  });

  await notifyLawyerAdminsAccountRegistrationPending({
    registeredUserId: userState.id,
    registeredUserFullName: userState.fullName,
    session: input.session,
  });

  return { changed: true };
}

export function assertClientMaySubmitNewCase(context: AuthenticatedContext): void {
  const effective = resolveEffectiveClientApprovalStatus(context.user);
  if (effective === ClientApprovalStatus.REJECTED) {
    throw new Error("Client rejected");
  }
}

export function isManagementCompanyApprovedForNewBuilding(context: AuthenticatedContext): boolean {
  return isClientApproved(context.user);
}
