import "server-only";

import type { PublishedFinancialSettingsVersion } from "@/modules/financial-settings/domain/published-financial-settings-version";
import {
  FINANCIAL_SETTINGS_SNAPSHOT_DISCLAIMER,
  type FinancialSettingsSnapshot,
} from "@/modules/financial-settings/domain/financial-settings-snapshot";
import { CONFIRMED_SUCCESS_FEE_EXCLUSIONS } from "@/modules/financial-settings/domain/success-fee-exclusion";
import {
  FinancialSettingsError,
  FinancialSettingsErrorCode,
} from "@/modules/financial-settings/domain/financial-settings-errors";
import { hasCompletePlatformFees } from "@/modules/financial-settings/domain/platform-fees";
import { CollectionAllocationOrder } from "@/modules/financial-settings/domain/collection-allocation-order";
import { resolveVatScheduleEntryForInstant } from "@/modules/financial-settings/domain/vat-schedule-resolution";

export { resolveVatScheduleEntryForInstant };

export function materializeFinancialSettingsSnapshot(
  version: PublishedFinancialSettingsVersion,
  asOf: Date,
  materializedAt: Date = new Date(),
): FinancialSettingsSnapshot {
  if (!hasCompletePlatformFees(version.platformFees)) {
    throw new FinancialSettingsError(
      FinancialSettingsErrorCode.VALIDATION,
      "Published version is missing platform fee configuration",
    );
  }

  const resolvedVatScheduleEntry = resolveVatScheduleEntryForInstant(
    version.vatSchedule,
    asOf,
  );

  const successFeeExclusions =
    version.escalation.successFeeExclusions && version.escalation.successFeeExclusions.length > 0
      ? version.escalation.successFeeExclusions
      : [...CONFIRMED_SUCCESS_FEE_EXCLUSIONS];

  return {
    disclaimer: FINANCIAL_SETTINGS_SNAPSHOT_DISCLAIMER,
    settingsVersionId: version.settingsVersionId,
    versionNumber: version.versionNumber,
    effectiveFrom: version.effectiveFrom,
    publishedAt: version.publishedAt,
    currency: version.currency,
    amountsMonetaryBasis: version.amounts.amountsMonetaryBasis,
    amounts: { ...version.amounts },
    platformFees: { ...version.platformFees },
    escalation: {
      ...version.escalation,
      successFeeExclusions,
      collectionAllocationOrder:
        version.escalation.collectionAllocationOrder ??
        CollectionAllocationOrder.UNSPECIFIED,
    },
    resolvedVatScheduleEntry: {
      effectiveFrom: resolvedVatScheduleEntry.effectiveFrom,
      rateBasisPoints: resolvedVatScheduleEntry.rateBasisPoints,
    },
    materializedAt,
    asOf,
  };
}
