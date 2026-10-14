export const FinancialSettingsErrorCode = {
  FORBIDDEN: "FINANCIAL_SETTINGS_FORBIDDEN",
  DRAFT_ALREADY_EXISTS: "FINANCIAL_SETTINGS_DRAFT_ALREADY_EXISTS",
  NO_DRAFT: "FINANCIAL_SETTINGS_NO_DRAFT",
  DRAFT_REVISION_CONFLICT: "FINANCIAL_SETTINGS_DRAFT_REVISION_CONFLICT",
  RETROACTIVE_EFFECTIVE_DATE: "FINANCIAL_SETTINGS_RETROACTIVE_EFFECTIVE_DATE",
  EFFECTIVE_DATE_CONFLICT: "FINANCIAL_SETTINGS_EFFECTIVE_DATE_CONFLICT",
  VERSION_IMMUTABLE: "FINANCIAL_SETTINGS_VERSION_IMMUTABLE",
  SOURCE_NOT_PUBLISHED: "FINANCIAL_SETTINGS_SOURCE_NOT_PUBLISHED",
  VALIDATION: "FINANCIAL_SETTINGS_VALIDATION",
  LEGACY_DRAFT_REQUIRES_GROSS_AMOUNTS: "FINANCIAL_SETTINGS_LEGACY_DRAFT_REQUIRES_GROSS_AMOUNTS",
  AUDIT_PERSISTENCE: "FINANCIAL_SETTINGS_AUDIT_PERSISTENCE",
} as const;

export type FinancialSettingsErrorCode =
  (typeof FinancialSettingsErrorCode)[keyof typeof FinancialSettingsErrorCode];

export class FinancialSettingsError extends Error {
  readonly code: FinancialSettingsErrorCode;

  constructor(code: FinancialSettingsErrorCode, message: string) {
    super(message);
    this.name = "FinancialSettingsError";
    this.code = code;
  }
}

export class FinancialSettingsForbiddenError extends FinancialSettingsError {
  constructor() {
    super(
      FinancialSettingsErrorCode.FORBIDDEN,
      "Financial settings operations require lawyer administrator privileges",
    );
  }
}

export class FinancialSettingsVersionImmutableError extends FinancialSettingsError {
  constructor(operation: string) {
    super(
      FinancialSettingsErrorCode.VERSION_IMMUTABLE,
      `Published financial settings versions cannot be modified (${operation})`,
    );
  }
}
