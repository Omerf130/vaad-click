/**
 * Domain types for future payment and trust-account workflows (CP6D — definitions only).
 * No payment integration, webhooks, or transfer execution in CP6D.
 */

export const PaymentSettlementTarget = {
  LAW_FIRM_TRUST_ACCOUNT: "law_firm_trust_account",
} as const;

export type PaymentSettlementTarget =
  (typeof PaymentSettlementTarget)[keyof typeof PaymentSettlementTarget];

export const PaymentChannel = {
  CREDIT_CARD: "credit_card",
  BANK_TRANSFER_INITIATION: "bank_transfer_initiation",
} as const;

export type PaymentChannel = (typeof PaymentChannel)[keyof typeof PaymentChannel];

export const PaymentProvenance = {
  PLATFORM_PROCESSED: "platform_processed",
  COMMITTEE_OFF_PLATFORM: "committee_off_platform",
} as const;

export type PaymentProvenance =
  (typeof PaymentProvenance)[keyof typeof PaymentProvenance];

/** Outbound trust-to-committee transfer batch lifecycle (execution deferred). */
export const TransferBatchStatus = {
  PREPARED: "prepared",
  LAWYER_APPROVED: "lawyer_approved",
  SUBMITTED_TO_BANK: "submitted_to_bank",
  CONFIRMED: "confirmed",
  FAILED: "failed",
  RETURNED: "returned",
} as const;

export type TransferBatchStatus =
  (typeof TransferBatchStatus)[keyof typeof TransferBatchStatus];
