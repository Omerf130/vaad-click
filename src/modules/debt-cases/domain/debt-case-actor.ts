import { AccountStatus } from "@/modules/users/domain/account-status";
import {
  canOperatorSubmitDebtCase,
  type ClientPortalUserState,
} from "@/modules/users/domain/client-portal-access";
import { UserRole } from "@/modules/users/domain/user-role";
import { DebtCaseError, DebtCaseErrorCode } from "@/modules/debt-cases/domain/debt-case-errors";

export const DebtCaseActorRole = {
  LAWYER_ADMIN: UserRole.LAWYER_ADMIN,
  BUILDING_REP: UserRole.BUILDING_REP,
  MANAGEMENT_COMPANY: UserRole.MANAGEMENT_COMPANY,
} as const;

export type DebtCaseOperatorRole =
  | typeof UserRole.BUILDING_REP
  | typeof UserRole.MANAGEMENT_COMPANY;

export type DebtCaseActorContext = {
  role: UserRole;
  accountStatus: AccountStatus;
  clientApprovalStatus?: import("@/modules/users/domain/client-approval-status").ClientApprovalStatus | null;
};

export function isDebtCaseOperatorRole(role: UserRole): role is DebtCaseOperatorRole {
  return role === UserRole.BUILDING_REP || role === UserRole.MANAGEMENT_COMPANY;
}

/** Rejected/disabled accounts cannot submit; unapproved clients may submit for lawyer client review. */
export function assertAccountMaySubmitDebtCase(context: DebtCaseActorContext): void {
  const portalState: ClientPortalUserState = {
    role: context.role,
    accountStatus: context.accountStatus,
    clientApprovalStatus: context.clientApprovalStatus ?? null,
  };
  if (!canOperatorSubmitDebtCase(portalState)) {
    throw new DebtCaseError(
      DebtCaseErrorCode.SUBMIT_NOT_ALLOWED,
      "Account cannot submit a debt case",
    );
  }
}

export function isLawyerAdminActor(context: DebtCaseActorContext): boolean {
  return context.role === UserRole.LAWYER_ADMIN;
}
