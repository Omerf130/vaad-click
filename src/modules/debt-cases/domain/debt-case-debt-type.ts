export const DebtCaseDebtType = {
  REGULAR_VAAD: "regular_vaad",
  SPECIAL_ASSESSMENT: "special_assessment",
} as const;

export type DebtCaseDebtType =
  (typeof DebtCaseDebtType)[keyof typeof DebtCaseDebtType];

export const DEBT_CASE_DEBT_TYPES: readonly DebtCaseDebtType[] =
  Object.values(DebtCaseDebtType);
