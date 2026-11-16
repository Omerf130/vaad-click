export const DebtCaseManualPaymentEntryType = {
  PAYMENT: "payment",
  REVERSAL: "reversal",
  ADJUSTMENT: "adjustment",
} as const;

export type DebtCaseManualPaymentEntryType =
  (typeof DebtCaseManualPaymentEntryType)[keyof typeof DebtCaseManualPaymentEntryType];