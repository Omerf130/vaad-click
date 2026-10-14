export const FinancialSettingsVersionStatus = {
  DRAFT: "draft",
  PUBLISHED: "published",
} as const;

export type FinancialSettingsVersionStatus =
  (typeof FinancialSettingsVersionStatus)[keyof typeof FinancialSettingsVersionStatus];

export const FINANCIAL_SETTINGS_VERSION_STATUSES: readonly FinancialSettingsVersionStatus[] =
  Object.values(FinancialSettingsVersionStatus);
