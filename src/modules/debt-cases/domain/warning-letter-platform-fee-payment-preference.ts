export const WarningLetterPlatformFeePaymentPreference = {
  IMMEDIATE_PAYMENT: "immediate_payment",
  ATTEMPT_DEBTOR_COLLECTION: "attempt_debtor_collection",
} as const;

export type WarningLetterPlatformFeePaymentPreference =
  (typeof WarningLetterPlatformFeePaymentPreference)[keyof typeof WarningLetterPlatformFeePaymentPreference];
