import type { DebtCasePlatformFeeFields } from "@/modules/debt-cases/domain/debt-case-record.types";

export function emptyDebtCasePlatformFeeFields(): DebtCasePlatformFeeFields {
  return {
    platformFeePreference: null,
    platformFeeAmountMinor: null,
    platformFeeCollectionStatus: null,
    platformFeeInternalNote: null,
    platformFeeStatusHistory: [],
  };
}
