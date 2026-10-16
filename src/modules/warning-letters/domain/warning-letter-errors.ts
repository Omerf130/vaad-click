export const WarningLetterErrorCode = {
  NOT_AUTHORIZED: "not_authorized",
  CASE_NOT_APPROVED_FOR_LETTER_PREP: "case_not_approved_for_letter_prep",
  MISSING_DEBTOR_NAME: "missing_debtor_name",
  MISSING_BUILDING_ADDRESS: "missing_building_address",
  MISSING_APARTMENT: "missing_apartment",
  MISSING_PRINCIPAL: "missing_principal",
  MISSING_DEBT_PERIOD: "missing_debt_period",
  MISSING_MANAGEMENT_COMPANY_NAME: "missing_management_company_name",
  MISSING_PUBLISHED_FINANCIAL_SETTINGS: "missing_published_financial_settings",
  INCOMPATIBLE_FINANCIAL_SETTINGS: "incompatible_financial_settings",
  MISSING_TREATMENT_FEE_WHEN_ELIGIBLE: "missing_treatment_fee_when_eligible",
  INCOMPLETE_OPERATIVE_SNAPSHOT: "incomplete_operative_snapshot",
} as const;

export type WarningLetterErrorCode =
  (typeof WarningLetterErrorCode)[keyof typeof WarningLetterErrorCode];

export class WarningLetterError extends Error {
  readonly code: WarningLetterErrorCode;

  constructor(code: WarningLetterErrorCode, message: string) {
    super(message);
    this.name = "WarningLetterError";
    this.code = code;
  }
}
