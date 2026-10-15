/** Future payment tracking (deferred). CP8 defines types only. */
export const DebtCasePaymentStatus = {
  NONE: "none",
} as const;

export type DebtCasePaymentStatus =
  (typeof DebtCasePaymentStatus)[keyof typeof DebtCasePaymentStatus];
