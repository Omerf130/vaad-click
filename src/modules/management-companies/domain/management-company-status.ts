export const ManagementCompanyStatus = {
  ACTIVE: "active",
  ARCHIVED: "archived",
} as const;

export type ManagementCompanyStatus =
  (typeof ManagementCompanyStatus)[keyof typeof ManagementCompanyStatus];
