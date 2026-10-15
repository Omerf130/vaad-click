import { AccountStatus } from "@/modules/users/domain/account-status";
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
};

export function isDebtCaseOperatorRole(role: UserRole): role is DebtCaseOperatorRole {
  return role === UserRole.BUILDING_REP || role === UserRole.MANAGEMENT_COMPANY;
}

/** Pending-approval users may draft only; submission requires active account. */
export function assertAccountMaySubmitDebtCase(context: DebtCaseActorContext): void {
  if (context.accountStatus !== AccountStatus.ACTIVE) {
    throw new DebtCaseError(
      DebtCaseErrorCode.SUBMIT_NOT_ALLOWED,
      "Account must be active to submit a debt case",
    );
  }
}

export function isLawyerAdminActor(context: DebtCaseActorContext): boolean {
  return context.role === UserRole.LAWYER_ADMIN;
}
