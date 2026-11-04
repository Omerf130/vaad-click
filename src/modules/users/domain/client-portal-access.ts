import { AccountStatus } from "@/modules/users/domain/account-status";
import {
  ClientApprovalStatus,
  type ClientApprovalStatus as ClientApprovalStatusType,
} from "@/modules/users/domain/client-approval-status";
import { UserRole } from "@/modules/users/domain/user-role";

export type ClientPortalUserState = {
  role: UserRole;
  accountStatus: AccountStatus;
  clientApprovalStatus: ClientApprovalStatusType | null | undefined;
};

/** Infer client approval for legacy rows missing `clientApprovalStatus`. */
export function resolveEffectiveClientApprovalStatus(
  input: ClientPortalUserState,
): ClientApprovalStatusType {
  if (
    input.clientApprovalStatus &&
    (Object.values(ClientApprovalStatus) as string[]).includes(input.clientApprovalStatus)
  ) {
    return input.clientApprovalStatus;
  }
  if (input.accountStatus === AccountStatus.REJECTED) {
    return ClientApprovalStatus.REJECTED;
  }
  if (input.accountStatus === AccountStatus.PENDING_APPROVAL) {
    return ClientApprovalStatus.AWAITING_SUBMISSION;
  }
  if (input.accountStatus === AccountStatus.ACTIVE) {
    return ClientApprovalStatus.APPROVED;
  }
  return ClientApprovalStatus.AWAITING_SUBMISSION;
}

export function isPortalOperatorRole(role: UserRole): boolean {
  return role === UserRole.BUILDING_REP || role === UserRole.MANAGEMENT_COMPANY;
}

/** Login + operator portal shell (dashboard), excluding blocked account states. */
export function canAccessOperatorPortal(input: ClientPortalUserState): boolean {
  if (!isPortalOperatorRole(input.role)) {
    return input.accountStatus === AccountStatus.ACTIVE;
  }
  if (
    input.accountStatus === AccountStatus.DISABLED ||
    input.accountStatus === AccountStatus.LOCKED
  ) {
    return false;
  }
  if (input.accountStatus === AccountStatus.REJECTED) {
    return false;
  }
  return (
    input.accountStatus === AccountStatus.ACTIVE ||
    input.accountStatus === AccountStatus.PENDING_APPROVAL
  );
}

export function isClientRejected(input: ClientPortalUserState): boolean {
  return resolveEffectiveClientApprovalStatus(input) === ClientApprovalStatus.REJECTED;
}

export function isClientApproved(input: ClientPortalUserState): boolean {
  return resolveEffectiveClientApprovalStatus(input) === ClientApprovalStatus.APPROVED;
}

export function canOperatorSubmitDebtCase(input: ClientPortalUserState): boolean {
  if (!canAccessOperatorPortal(input)) {
    return false;
  }
  if (isClientRejected(input)) {
    return false;
  }
  return true;
}

export function canOperatorUsePrivilegedLegalActions(input: ClientPortalUserState): boolean {
  return canAccessOperatorPortal(input) && isClientApproved(input);
}
