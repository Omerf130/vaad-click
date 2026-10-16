export const WarningLetterDeliveryRecordStatus = {
  AUTHORIZED: "authorized",
  ATTEMPT_RECORDED: "attempt_recorded",
  EVIDENCE_PENDING: "evidence_pending",
  EVIDENCE_RECORDED: "evidence_recorded",
  FAILED: "failed",
  CANCELLED: "cancelled",
} as const;

export type WarningLetterDeliveryRecordStatus =
  (typeof WarningLetterDeliveryRecordStatus)[keyof typeof WarningLetterDeliveryRecordStatus];
