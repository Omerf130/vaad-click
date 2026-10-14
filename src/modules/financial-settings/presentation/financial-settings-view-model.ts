import type { PublishedFinancialSettingsVersion } from "@/modules/financial-settings/domain/published-financial-settings-version";
import { selectApplicableVersionByEffectiveFrom } from "@/modules/financial-settings/domain/effective-date-resolution";
import {
  formatBasisPointsAsPercentDisplay,
  formatMinorUnitsAsShekels,
} from "@/shared/financial/decimal-string-parse";
import { jerusalemIsoDateFromInstant, startOfDayJerusalem } from "@/shared/time/jerusalem-calendar";

export type PublishedVersionSummary = {
  settingsVersionId: string;
  versionNumber: number;
  effectiveFromIso: string;
  publishedAtIso: string;
  debtorTreatmentFeeShekels: string;
  committeeWaiverFeeShekels: string;
  escalationPercent: string;
  vatScheduleSummary: string;
};

export type DraftViewModel = {
  settingsVersionId: string;
  revision: number;
  currency: string;
  debtorTreatmentFeeShekels: string;
  committeeWaiverFeeShekels: string;
  escalationPercent: string;
  vatRows: { effectiveFromIso: string; ratePercent: string }[];
  notesInternal: string;
  clonedFromSettingsVersionId: string | null;
  showSuggestedValueHints: boolean;
};

export function mapPublishedToSummary(
  version: PublishedFinancialSettingsVersion,
): PublishedVersionSummary {
  const vatSummary = version.vatSchedule
    .map(
      (row) =>
        `${jerusalemIsoDateFromInstant(row.effectiveFrom)}: ${formatBasisPointsAsPercentDisplay(row.rateBasisPoints)}%`,
    )
    .join(" · ");

  return {
    settingsVersionId: version.settingsVersionId,
    versionNumber: version.versionNumber,
    effectiveFromIso: jerusalemIsoDateFromInstant(version.effectiveFrom),
    publishedAtIso: version.publishedAt.toISOString(),
    debtorTreatmentFeeShekels: formatMinorUnitsAsShekels(
      version.amounts.debtorTreatmentFeeExVat.amountMinor,
    ),
    committeeWaiverFeeShekels: formatMinorUnitsAsShekels(
      version.amounts.committeeTreatmentFeeWhenDebtorWaivedExVat.amountMinor,
    ),
    escalationPercent: formatBasisPointsAsPercentDisplay(
      version.escalation.recoveryFeeRateBasisPoints,
    ),
    vatScheduleSummary: vatSummary,
  };
}

export function partitionPublishedVersions(
  versions: PublishedFinancialSettingsVersion[],
  asOf: Date,
): {
  applicable: PublishedFinancialSettingsVersion | null;
  future: PublishedVersionSummary[];
  historical: PublishedVersionSummary[];
} {
  const applicable = selectApplicableVersionByEffectiveFrom(versions, asOf);
  const asOfStart = startOfDayJerusalem(jerusalemIsoDateFromInstant(asOf)).getTime();

  const future = versions
    .filter((version) => version.effectiveFrom.getTime() > asOfStart)
    .sort((a, b) => a.effectiveFrom.getTime() - b.effectiveFrom.getTime())
    .map(mapPublishedToSummary);

  const historical = versions
    .filter((version) => version.effectiveFrom.getTime() <= asOfStart)
    .sort((a, b) => b.effectiveFrom.getTime() - a.effectiveFrom.getTime())
    .map(mapPublishedToSummary);

  return { applicable, future, historical };
}

export function mapDraftDocumentToViewModel(input: {
  draft: {
    settingsVersionId: string;
    revision: number;
    currency: string;
    amounts?: {
      debtorTreatmentFeeExVat?: { amountMinor: number };
      committeeTreatmentFeeWhenDebtorWaivedExVat?: { amountMinor: number };
    };
    vatSchedule?: { effectiveFrom: Date; rateBasisPoints: number }[];
    escalation?: { recoveryFeeRateBasisPoints?: number };
    notesInternal?: string | null;
    provenance?: { clonedFromSettingsVersionId?: string | null } | null;
  };
  publishedCount: number;
}): DraftViewModel {
  const clonedFrom = input.draft.provenance?.clonedFromSettingsVersionId ?? null;
  const showSuggestedValueHints = input.publishedCount === 0 && !clonedFrom;

  return {
    settingsVersionId: input.draft.settingsVersionId,
    revision: input.draft.revision,
    currency: input.draft.currency,
    debtorTreatmentFeeShekels: input.draft.amounts?.debtorTreatmentFeeExVat
      ? formatMinorUnitsAsShekels(input.draft.amounts.debtorTreatmentFeeExVat.amountMinor)
      : "",
    committeeWaiverFeeShekels: input.draft.amounts?.committeeTreatmentFeeWhenDebtorWaivedExVat
      ? formatMinorUnitsAsShekels(
          input.draft.amounts.committeeTreatmentFeeWhenDebtorWaivedExVat.amountMinor,
        )
      : "",
    escalationPercent:
      input.draft.escalation?.recoveryFeeRateBasisPoints != null
        ? formatBasisPointsAsPercentDisplay(input.draft.escalation.recoveryFeeRateBasisPoints)
        : "",
    vatRows: (input.draft.vatSchedule ?? []).map((row) => ({
      effectiveFromIso: jerusalemIsoDateFromInstant(row.effectiveFrom),
      ratePercent: formatBasisPointsAsPercentDisplay(row.rateBasisPoints),
    })),
    notesInternal: input.draft.notesInternal ?? "",
    clonedFromSettingsVersionId: clonedFrom,
    showSuggestedValueHints,
  };
}
