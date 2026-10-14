import { AccountStatus } from "@/modules/users/domain/account-status";
import { UserRole } from "@/modules/users/domain/user-role";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";

/** Safe account-status page for pending/rejected (and informational for active). */
export function canAccessAccountStatusPage(context: AuthenticatedContext): boolean {
  if (context.user.role === UserRole.LAWYER_ADMIN) {
    return false;
  }
  const { accountStatus } = context.user;
  return (
    accountStatus === AccountStatus.PENDING_APPROVAL ||
    accountStatus === AccountStatus.REJECTED ||
    accountStatus === AccountStatus.ACTIVE
  );
}

/**
 * Operational portal (/app) — approved (`active`) accounts only.
 * Building-scoped data uses `resolveBuildingAccessScope` (CP6B).
 */
export function canAccessOperationalPortal(context: AuthenticatedContext): boolean {
  if (context.user.role === UserRole.LAWYER_ADMIN) {
    return context.user.accountStatus === AccountStatus.ACTIVE;
  }
  return context.user.accountStatus === AccountStatus.ACTIVE;
}
