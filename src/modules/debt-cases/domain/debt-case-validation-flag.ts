export const DebtCaseValidationFlagSeverity = {
  WARN: "warn",
  BLOCK: "block",
} as const;

export type DebtCaseValidationFlagSeverity =
  (typeof DebtCaseValidationFlagSeverity)[keyof typeof DebtCaseValidationFlagSeverity];

export const DebtCaseValidationFlagCode = {
  AMOUNT_ABOVE_BUILDING_AVERAGE: "amount_above_building_average",
  DEBTOR_PHONE_MATCHES_OPERATOR: "debtor_phone_matches_operator",
  TENANT_OWNER_PHONE_SAME: "tenant_owner_phone_same",
  REPEAT_DEBTOR: "repeat_debtor",
  OVERLAPPING_OPEN_CASE: "overlapping_open_case",
  LEGAL_READINESS_INCOMPLETE: "legal_readiness_incomplete",
  SUCCESSOR_REQUIRES_SENT_LETTER: "successor_requires_sent_letter",
} as const;

export type DebtCaseValidationFlagCode =
  (typeof DebtCaseValidationFlagCode)[keyof typeof DebtCaseValidationFlagCode];

export type DebtCaseValidationFlag = {
  code: DebtCaseValidationFlagCode;
  severity: DebtCaseValidationFlagSeverity;
  messageHe: string;
};
