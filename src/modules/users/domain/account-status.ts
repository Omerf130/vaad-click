export const AccountStatus = {
  ACTIVE: "active",
  DISABLED: "disabled",
  LOCKED: "locked",
} as const;

export type AccountStatus = (typeof AccountStatus)[keyof typeof AccountStatus];

export function isAccountLoginAllowed(status: AccountStatus): boolean {
  return status === AccountStatus.ACTIVE;
}
