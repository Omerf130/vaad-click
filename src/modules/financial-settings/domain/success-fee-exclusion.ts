/** Amounts excluded from legal success fee calculation (policy metadata — no calculator in CP6D). */
export const SuccessFeeExclusion = {
  COURT_AWARDED_LEGAL_FEES_AND_EXPENSES: "court_awarded_legal_fees_and_expenses",
  COURT_FEE_REIMBURSEMENTS: "court_fee_reimbursements",
  ENFORCEMENT_FEES: "enforcement_fees",
  WARNING_LETTER_TREATMENT_EXPENSES: "warning_letter_treatment_expenses",
} as const;

export type SuccessFeeExclusion =
  (typeof SuccessFeeExclusion)[keyof typeof SuccessFeeExclusion];

export const SUCCESS_FEE_EXCLUSIONS: readonly SuccessFeeExclusion[] =
  Object.values(SuccessFeeExclusion);

/** Confirmed client exclusions — applied to new draft saves / publishes in CP6D. */
export const CONFIRMED_SUCCESS_FEE_EXCLUSIONS: readonly SuccessFeeExclusion[] = [
  SuccessFeeExclusion.COURT_AWARDED_LEGAL_FEES_AND_EXPENSES,
  SuccessFeeExclusion.COURT_FEE_REIMBURSEMENTS,
  SuccessFeeExclusion.ENFORCEMENT_FEES,
  SuccessFeeExclusion.WARNING_LETTER_TREATMENT_EXPENSES,
];
