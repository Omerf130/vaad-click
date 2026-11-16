/** Manual payment reporting (CP22) — not gateway collection. */
export const DebtCasePaymentStatus = {
  NONE: "none",
  PARTIAL_REPORTED: "partial_reported",
  FULL_REPORTED: "full_reported",
} as const;

export type DebtCasePaymentStatus =
  (typeof DebtCasePaymentStatus)[keyof typeof DebtCasePaymentStatus];