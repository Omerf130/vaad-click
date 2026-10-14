import "server-only";

import type { PublishedFinancialSettingsVersion } from "@/modules/financial-settings/domain/published-financial-settings-version";
import {
  FINANCIAL_SETTINGS_SNAPSHOT_DISCLAIMER,
  type FinancialSettingsSnapshot,
} from "@/modules/financial-settings/domain/financial-settings-snapshot";
import {
  FinancialSettingsError,
  FinancialSettingsErrorCode,
} from "@/modules/financial-settings/domain/financial-settings-errors";
import type { VatScheduleEntry } from "@/modules/financial-settings/domain/published-financial-settings-version";

export function resolveVatScheduleEntryForInstant(
  schedule: VatScheduleEntry[],
  asOf: Date,
): VatScheduleEntry {
  const sorted = [...schedule].sort(
    (left, right) => left.effectiveFrom.getTime() - right.effectiveFrom.getTime(),
  );

  let selected: VatScheduleEntry | null = null;
  for (const entry of sorted) {
    if (entry.effectiveFrom.getTime() <= asOf.getTime()) {
      selected = entry;
    } else {
      break;
    }
  }

  if (!selected) {
    throw new FinancialSettingsError(
      FinancialSettingsErrorCode.VALIDATION,
      "No VAT schedule entry applies at the requested instant",
    );
  }

  return selected;
}

export function materializeFinancialSettingsSnapshot(
  version: PublishedFinancialSettingsVersion,
  asOf: Date,
  materializedAt: Date = new Date(),
): FinancialSettingsSnapshot {
  const resolvedVatScheduleEntry = resolveVatScheduleEntryForInstant(
    version.vatSchedule,
    asOf,
  );

  return {
    disclaimer: FINANCIAL_SETTINGS_SNAPSHOT_DISCLAIMER,
    settingsVersionId: version.settingsVersionId,
    versionNumber: version.versionNumber,
    effectiveFrom: version.effectiveFrom,
    publishedAt: version.publishedAt,
    currency: version.currency,
    amounts: { ...version.amounts },
    escalation: { ...version.escalation },
    resolvedVatScheduleEntry: {
      effectiveFrom: resolvedVatScheduleEntry.effectiveFrom,
      rateBasisPoints: resolvedVatScheduleEntry.rateBasisPoints,
    },
    materializedAt,
    asOf,
  };
}
