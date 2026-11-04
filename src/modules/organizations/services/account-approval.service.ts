import "server-only";

import mongoose, { Types } from "mongoose";

import {
  OrganizationError,
  OrganizationErrorCode,
} from "@/modules/buildings/domain/organization-errors";
import { assertLawyerAdminOrganization } from "@/modules/organizations/services/assert-lawyer-admin";
import {
  recordAccountApproved,
  recordAccountReconsidered,
  recordAccountRejected,
} from "@/modules/organizations/services/organization-audit.service";
import { AccountStatus } from "@/modules/users/domain/account-status";
import { ClientApprovalStatus } from "@/modules/users/domain/client-approval-status";
import { resolveEffectiveClientApprovalStatus } from "@/modules/users/domain/client-portal-access";
import { UserRole } from "@/modules/users/domain/user-role";
import { User } from "@/modules/users/infra/user.model";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import { AuditWriteFailedError } from "@/shared/audit/errors/audit-errors";
import {
  notifyUserAccountApproved,
  notifyUserAccountRejected,
} from "@/modules/notifications/services/notification-dispatch.service";
import { connectMongo } from "@/shared/db/connect";

function mapAuditError(error: unknown): never {
  if (error instanceof AuditWriteFailedError) {
    throw new OrganizationError(
      OrganizationErrorCode.AUDIT_PERSISTENCE,
      "Account review could not be recorded",
    );
  }
  throw error;
}

async function loadReviewableUser(targetUserId: string) {
  if (!Types.ObjectId.isValid(targetUserId)) {
    throw new OrganizationError(OrganizationErrorCode.NOT_FOUND, "User not found");
  }
  const user = await User.findById(targetUserId).lean();
  if (!user) {
    throw new OrganizationError(OrganizationErrorCode.NOT_FOUND, "User not found");
  }
  if (
    user.role !== UserRole.BUILDING_REP &&
    user.role !== UserRole.MANAGEMENT_COMPANY
  ) {
    throw new OrganizationError(OrganizationErrorCode.INVALID_ROLE, "Invalid account role");
  }
  return user;
}

export async function approveRegisteredAccount(input: {
  context: AuthenticatedContext;
  targetUserId: string;
  correlationId?: string;
}) {
  assertLawyerAdminOrganization(input.context);
  const user = await loadReviewableUser(input.targetUserId);
  const clientApproval = resolveEffectiveClientApprovalStatus({
    role: user.role as UserRole,
    accountStatus: user.accountStatus as AccountStatus,
    clientApprovalStatus: user.clientApprovalStatus as ClientApprovalStatus | null,
  });
  const legacyPendingAccount = user.accountStatus === AccountStatus.PENDING_APPROVAL;
  const pendingClient = clientApproval === ClientApprovalStatus.PENDING_LAWYER_APPROVAL;
  if (!legacyPendingAccount && !pendingClient) {
    throw new OrganizationError(
      OrganizationErrorCode.INVALID_ACCOUNT_STATUS,
      "Client is not awaiting approval",
    );
  }

  await connectMongo();
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const updated = await User.findOneAndUpdate(
        {
          _id: user._id,
          $or: [
            { accountStatus: AccountStatus.PENDING_APPROVAL },
            { clientApprovalStatus: ClientApprovalStatus.PENDING_LAWYER_APPROVAL },
          ],
        },
        {
          accountStatus: AccountStatus.ACTIVE,
          clientApprovalStatus: ClientApprovalStatus.APPROVED,
        },
        { session, new: true },
      ).lean();
      if (!updated) {
        throw new OrganizationError(OrganizationErrorCode.CONFLICT, "Account state changed");
      }
      await recordAccountApproved({
        context: input.context,
        targetUserId: input.targetUserId,
        correlationId: input.correlationId,
        session,
      });
      await notifyUserAccountApproved({
        targetUserId: input.targetUserId,
        session,
      });
    });
  } catch (error) {
    mapAuditError(error);
  } finally {
    await session.endSession();
  }
}

export async function rejectRegisteredAccount(input: {
  context: AuthenticatedContext;
  targetUserId: string;
  correlationId?: string;
}) {
  assertLawyerAdminOrganization(input.context);
  const user = await loadReviewableUser(input.targetUserId);
  const clientApproval = resolveEffectiveClientApprovalStatus({
    role: user.role as UserRole,
    accountStatus: user.accountStatus as AccountStatus,
    clientApprovalStatus: user.clientApprovalStatus as ClientApprovalStatus | null,
  });
  const rejectable =
    user.accountStatus === AccountStatus.PENDING_APPROVAL ||
    clientApproval === ClientApprovalStatus.PENDING_LAWYER_APPROVAL ||
    clientApproval === ClientApprovalStatus.AWAITING_SUBMISSION;
  if (!rejectable) {
    throw new OrganizationError(
      OrganizationErrorCode.INVALID_ACCOUNT_STATUS,
      "Client is not awaiting approval",
    );
  }

  await connectMongo();
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const updated = await User.findOneAndUpdate(
        {
          _id: user._id,
          accountStatus: { $ne: AccountStatus.REJECTED },
        },
        {
          accountStatus: AccountStatus.REJECTED,
          clientApprovalStatus: ClientApprovalStatus.REJECTED,
        },
        { session, new: true },
      ).lean();
      if (!updated) {
        throw new OrganizationError(OrganizationErrorCode.CONFLICT, "Account state changed");
      }
      await recordAccountRejected({
        context: input.context,
        targetUserId: input.targetUserId,
        correlationId: input.correlationId,
        session,
      });
      await notifyUserAccountRejected({
        targetUserId: input.targetUserId,
        session,
      });
    });
  } catch (error) {
    mapAuditError(error);
  } finally {
    await session.endSession();
  }
}

export async function reconsiderRejectedAccount(input: {
  context: AuthenticatedContext;
  targetUserId: string;
  correlationId?: string;
}) {
  assertLawyerAdminOrganization(input.context);
  const user = await loadReviewableUser(input.targetUserId);
  if (user.accountStatus !== AccountStatus.REJECTED) {
    throw new OrganizationError(
      OrganizationErrorCode.INVALID_ACCOUNT_STATUS,
      "Account is not rejected",
    );
  }

  await connectMongo();
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const updated = await User.findOneAndUpdate(
        { _id: user._id, accountStatus: AccountStatus.REJECTED },
        { accountStatus: AccountStatus.ACTIVE },
        { session, new: true },
      ).lean();
      if (!updated) {
        throw new OrganizationError(OrganizationErrorCode.CONFLICT, "Account state changed");
      }
      await recordAccountReconsidered({
        context: input.context,
        targetUserId: input.targetUserId,
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
