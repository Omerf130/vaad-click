import { Types } from "mongoose";

import { AccountStatus } from "@/modules/users/domain/account-status";
import { ClientApprovalStatus } from "@/modules/users/domain/client-approval-status";
import { resolveEffectiveClientApprovalStatus } from "@/modules/users/domain/client-portal-access";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";

import { DebtCaseWorkflowStatus } from "./debt-case-workflow-status";

/** Legacy registration gate: pending account may only see own drafts. */
export function buildPendingUserDraftListFilter(userId: string): Record<string, unknown> {
  return {
    createdByUserId: new Types.ObjectId(userId),
    workflowStatus: DebtCaseWorkflowStatus.DRAFT,
  };
}

/**
 * Extra Mongo filter for operator debt-case lists/metrics.
 * Approved clients see all cases in scoped buildings; others only their own cases.
 */
export function buildOperatorDebtCaseVisibilityFilter(
  user: AuthenticatedContext["user"],
): Record<string, unknown> | null {
  const effective = resolveEffectiveClientApprovalStatus(user);
  if (effective === ClientApprovalStatus.APPROVED) {
    return null;
  }
  if (user.accountStatus === AccountStatus.PENDING_APPROVAL) {
    return buildPendingUserDraftListFilter(user.id);
  }
  return { createdByUserId: new Types.ObjectId(user.id) };
}
