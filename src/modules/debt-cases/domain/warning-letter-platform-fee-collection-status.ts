import { WarningLetterPlatformFeePaymentPreference } from "@/modules/debt-cases/domain/warning-letter-platform-fee-payment-preference";

/** Collection / payment tracking for the platform warning-letter fee (CP18B). */
export const WarningLetterPlatformFeeCollectionStatus = {
  AWAITING_ONLINE_PAYMENT: "awaiting_online_payment",
  DEBTOR_COLLECTION_REQUESTED: "debtor_collection_requested",
  COLLECTION_IN_PROGRESS: "collection_in_progress",
  PAID_SETTLED: "paid_settled",
  MANUAL_FOLLOW_UP_REQUIRED: "manual_follow_up_required",
} as const;

export type WarningLetterPlatformFeeCollectionStatus =
  (typeof WarningLetterPlatformFeeCollectionStatus)[keyof typeof WarningLetterPlatformFeeCollectionStatus];

export function initialPlatformFeeCollectionStatus(
  preference: WarningLetterPlatformFeePaymentPreference,
): WarningLetterPlatformFeeCollectionStatus {
  if (preference === WarningLetterPlatformFeePaymentPreference.IMMEDIATE_PAYMENT) {
    return WarningLetterPlatformFeeCollectionStatus.AWAITING_ONLINE_PAYMENT;
  }
  return WarningLetterPlatformFeeCollectionStatus.DEBTOR_COLLECTION_REQUESTED;
}

/** Lawyer-admin manual transitions (no automatic paid state). */
export const LAWYER_ALLOWED_PLATFORM_FEE_STATUS_TRANSITIONS: Record<
  WarningLetterPlatformFeeCollectionStatus,
  readonly WarningLetterPlatformFeeCollectionStatus[]
> = {
  [WarningLetterPlatformFeeCollectionStatus.AWAITING_ONLINE_PAYMENT]: [
    WarningLetterPlatformFeeCollectionStatus.PAID_SETTLED,
    WarningLetterPlatformFeeCollectionStatus.MANUAL_FOLLOW_UP_REQUIRED,
  ],
  [WarningLetterPlatformFeeCollectionStatus.DEBTOR_COLLECTION_REQUESTED]: [
    WarningLetterPlatformFeeCollectionStatus.COLLECTION_IN_PROGRESS,
    WarningLetterPlatformFeeCollectionStatus.PAID_SETTLED,
    WarningLetterPlatformFeeCollectionStatus.MANUAL_FOLLOW_UP_REQUIRED,
  ],
  [WarningLetterPlatformFeeCollectionStatus.COLLECTION_IN_PROGRESS]: [
    WarningLetterPlatformFeeCollectionStatus.PAID_SETTLED,
    WarningLetterPlatformFeeCollectionStatus.MANUAL_FOLLOW_UP_REQUIRED,
  ],
  [WarningLetterPlatformFeeCollectionStatus.MANUAL_FOLLOW_UP_REQUIRED]: [
    WarningLetterPlatformFeeCollectionStatus.COLLECTION_IN_PROGRESS,
    WarningLetterPlatformFeeCollectionStatus.PAID_SETTLED,
  ],
  [WarningLetterPlatformFeeCollectionStatus.PAID_SETTLED]: [],
};
