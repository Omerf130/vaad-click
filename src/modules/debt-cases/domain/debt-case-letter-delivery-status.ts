/** Future warning-letter delivery (CP9+). CP8 defines types only. */
export const DebtCaseLetterDeliveryStatus = {
  NONE: "none",
  PENDING_SEND: "pending_send",
  SENT: "sent",
} as const;

export type DebtCaseLetterDeliveryStatus =
  (typeof DebtCaseLetterDeliveryStatus)[keyof typeof DebtCaseLetterDeliveryStatus];
