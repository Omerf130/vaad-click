import type { WarningLetterPlatformFeeCollectionStatus } from "@/modules/debt-cases/domain/warning-letter-platform-fee-collection-status";

export type WarningLetterPlatformFeeStatusHistoryEntry = {
  fromStatus: WarningLetterPlatformFeeCollectionStatus | null;
  toStatus: WarningLetterPlatformFeeCollectionStatus;
  note: string | null;
  updatedByUserId: string;
  updatedAtIso: string;
};
