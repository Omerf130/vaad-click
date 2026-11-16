export const WarningLetterDeliveryRecordStatus = {
  ATTEMPTED: "attempted",
  SENT: "sent",
  CONFIRMED_DELIVERED: "confirmed_delivered",
  FAILED: "failed",
  CANCELLED: "cancelled",
  /** @deprecated CP20 two-step flow */
  AUTHORIZED: "authorized",
  /** @deprecated */
  ATTEMPT_RECORDED: "attempt_recorded",
  /** @deprecated */
  EVIDENCE_PENDING: "evidence_pending",
  /** @deprecated */
  EVIDENCE_RECORDED: "evidence_recorded",
} as const;

export type WarningLetterDeliveryRecordStatus =
  (typeof WarningLetterDeliveryRecordStatus)[keyof typeof WarningLetterDeliveryRecordStatus];

export const WARNING_LETTER_OPERATIVE_DELIVERY_STATUSES: readonly WarningLetterDeliveryRecordStatus[] = [
  WarningLetterDeliveryRecordStatus.ATTEMPTED,
  WarningLetterDeliveryRecordStatus.SENT,
  WarningLetterDeliveryRecordStatus.CONFIRMED_DELIVERED,
  WarningLetterDeliveryRecordStatus.FAILED,
];

export function formatWarningLetterDeliveryRecordStatusHe(
  status: WarningLetterDeliveryRecordStatus | string,
): string {
  switch (status) {
    case WarningLetterDeliveryRecordStatus.ATTEMPTED:
      return "ניסיון משלוח";
    case WarningLetterDeliveryRecordStatus.SENT:
      return "נשלח (תיעוד עורך דין)";
    case WarningLetterDeliveryRecordStatus.CONFIRMED_DELIVERED:
      return "אושרה קבלה";
    case WarningLetterDeliveryRecordStatus.FAILED:
      return "נכשל";
    case WarningLetterDeliveryRecordStatus.CANCELLED:
      return "בוטל";
    case WarningLetterDeliveryRecordStatus.AUTHORIZED:
      return "הרשאה לתיעוד (legacy)";
    case WarningLetterDeliveryRecordStatus.ATTEMPT_RECORDED:
      return "ניסיון תועד (legacy)";
    case WarningLetterDeliveryRecordStatus.EVIDENCE_RECORDED:
      return "הוכחה תועדה (legacy)";
    default:
      return String(status);
  }
}

export function deliveryStatusTriggersCaseLetterSent(
  status: WarningLetterDeliveryRecordStatus,
): boolean {
  return status === WarningLetterDeliveryRecordStatus.SENT;
}