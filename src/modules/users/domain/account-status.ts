export const AccountStatus = {
  PENDING_APPROVAL: "pending_approval",
  ACTIVE: "active",
  REJECTED: "rejected",
  DISABLED: "disabled",
  LOCKED: "locked",
} as const;

export type AccountStatus = (typeof AccountStatus)[keyof typeof AccountStatus];

export const ACCOUNT_STATUSES: readonly AccountStatus[] = Object.values(AccountStatus);

export function isAccountStatus(value: string): value is AccountStatus {
  return (ACCOUNT_STATUSES as readonly string[]).includes(value);
}

/** Legacy helper — operational sessions for approved accounts. */
export function isAccountLoginAllowed(status: AccountStatus): boolean {
  return status === AccountStatus.ACTIVE;
}

export function isLawyerAdminLoginAllowed(status: AccountStatus): boolean {
  return status === AccountStatus.ACTIVE;
}

/** Email/password login for building_rep and management_company. */
export function isPortalPasswordLoginAllowed(status: AccountStatus): boolean {
  if (status === AccountStatus.DISABLED || status === AccountStatus.LOCKED) {
    return false;
  }
  return (
    status === AccountStatus.ACTIVE ||
    status === AccountStatus.PENDING_APPROVAL ||
    status === AccountStatus.REJECTED
  );
}
