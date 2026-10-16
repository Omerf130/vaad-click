export const WarningLetterFinalDocumentStatus = {
  /** Content frozen; PDF/dispatch prerequisites not met. */
  FINALIZED_PENDING_OPERATIVE_PREREQUISITES: "finalized_pending_operative_prerequisites",
  /** Frozen and ready for lawyer-controlled delivery workspace (still no auto-send). */
  READY_FOR_DELIVERY: "ready_for_delivery",
  DELIVERY_IN_PROGRESS: "delivery_in_progress",
  DELIVERY_EVIDENCE_PENDING: "delivery_evidence_pending",
  DELIVERY_RECORDED: "delivery_recorded",
  DELIVERY_FAILED: "delivery_failed",
  DELIVERY_CANCELLED: "delivery_cancelled",
} as const;

export type WarningLetterFinalDocumentStatus =
  (typeof WarningLetterFinalDocumentStatus)[keyof typeof WarningLetterFinalDocumentStatus];
