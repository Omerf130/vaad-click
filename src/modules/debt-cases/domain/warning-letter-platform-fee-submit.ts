import { WARNING_LETTER_PLATFORM_FEE_AMOUNT_MINOR } from "@/modules/debt-cases/domain/warning-letter-platform-fee.constants";
import { initialPlatformFeeCollectionStatus } from "@/modules/debt-cases/domain/warning-letter-platform-fee-collection-status";
import type { WarningLetterPlatformFeePaymentPreference } from "@/modules/debt-cases/domain/warning-letter-platform-fee-payment-preference";

/** Server-authoritative fields applied when a case is submitted with a payment preference. */
export function buildPlatformFeeFieldsForCaseSubmit(preference: WarningLetterPlatformFeePaymentPreference) {
  return {
    platformFeePreference: preference,
    platformFeeAmountMinor: WARNING_LETTER_PLATFORM_FEE_AMOUNT_MINOR,
    platformFeeCollectionStatus: initialPlatformFeeCollectionStatus(preference),
    platformFeeInternalNote: null,
    platformFeeStatusHistory: [],
  };
}
