import type { AmountsMonetaryBasis } from "@/modules/financial-settings/domain/amounts-monetary-basis";
import { isGrossInclusiveVatBasis } from "@/modules/financial-settings/domain/amounts-monetary-basis";
import { selectApplicableVersionByEffectiveFrom } from "@/modules/financial-settings/domain/effective-date-resolution";
import {
  draftRequiresExplicitGrossAmountReentry,
  readAmountsMonetaryBasisFromDocument,
  debtorTreatmentFeePrimaryDisplayMinor,
  committeeTreatmentFeePrimaryDisplayMinor,
  publishedAmountsUseGrossInclusiveDisplay,
} from "@/modules/financial-settings/domain/financial-settings-amounts";
import type { PublishedFinancialSettingsVersion } from "@/modules/financial-settings/domain/published-financial-settings-version";
import type { FinancialSettingsVersionAmounts } from "@/modules/financial-settings/domain/financial-settings-amounts";
import {
  formatBasisPointsAsPercentDisplay,
  formatMinorUnitsAsShekels,
} from "@/shared/financial/decimal-string-parse";
import { deriveNetAndVatFromGrossMinor } from "@/shared/financial/vat-amount-breakdown";
import { jerusalemIsoDateFromInstant, startOfDayJerusalem } from "@/shared/time/jerusalem-calendar";
import { resolveVatScheduleEntryForInstant } from "@/modules/financial-settings/domain/vat-schedule-resolution";

export type TreatmentFeePublishPreview = {
  grossShekels: string;
  netShekels: string;
  vatShekels: string;
  vatRatePercent: string;
};

export type PublishedVersionSummary = {
  settingsVersionId: string;
  versionNumber: number;
  effectiveFromIso: string;
  publishedAtIso: string;
  amountsMonetaryBasis: AmountsMonetaryBasis;
  debtorTreatmentFeeShekels: string;
  committeeAssumedTreatmentFeeShekels: string;
  debtorTreatmentFeeNetShekels: string | null;
  debtorTreatmentFeeVatShekels: string | null;
  committeeAssumedTreatmentFeeNetShekels: string | null;
  committeeAssumedTreatmentFeeVatShekels: string | null;
  trustAccountProcessingFeePercent: string;
  committeeTransferFeePercent: string;
  escalationPercent: string;
  vatScheduleSummary: string;
};

export type DraftViewModel = {
  settingsVersionId: string;
  revision: number;
  currency: string;
  amountsMonetaryBasis: AmountsMonetaryBasis;
  requiresGrossAmountReentry: boolean;
  legacyDebtorNetShekels: string | null;
  legacyCommitteeNetShekels: string | null;
  debtorTreatmentFeeShekels: string;
  committeeAssumedTreatmentFeeShekels: string;
  trustAccountProcessingFeePercent: string;
  committeeTransferFeePercent: string;
  escalationPercent: string;
  vatRows: { effectiveFromIso: string; ratePercent: string }[];
  notesInternal: string;
  clonedFromSettingsVersionId: string | null;
  showSuggestedValueHints: boolean;
};

export function computeTreatmentFeePublishPreview(input: {
  grossShekels: string;
  vatRows: { effectiveFromIso: string; ratePercent: string }[];
  effectiveFromIso: string;
}): TreatmentFeePublishPreview | null {
  const grossParsed = input.grossShekels.trim();
  if (!grossParsed) {
    return null;
  }

  const grossMinor = Math.round(Number.parseFloat(grossParsed.replace(",", ".")) * 100);
  if (!Number.isFinite(grossMinor) || grossMinor < 0) {
    return null;
  }

  const schedule = input.vatRows
    .filter((row) => row.effectiveFromIso && row.ratePercent.trim())
    .map((row) => ({
      effectiveFrom: startOfDayJerusalem(row.effectiveFromIso),
      rateBasisPoints: Math.round(Number.parseFloat(row.ratePercent.replace(",", ".")) * 100),
    }));

  if (schedule.length === 0) {
    return null;
  }

  try {
    const vatEntry = resolveVatScheduleEntryForInstant(
      schedule,
      startOfDayJerusalem(input.effectiveFromIso),
    );
    const breakdown = deriveNetAndVatFromGrossMinor({
      grossMinor,
      vatRateBasisPoints: vatEntry.rateBasisPoints,
    });
    return {
      grossShekels: formatMinorUnitsAsShekels(breakdown.grossMinor),
      netShekels: formatMinorUnitsAsShekels(breakdown.netMinor),
      vatShekels: formatMinorUnitsAsShekels(breakdown.vatMinor),
      vatRatePercent: formatBasisPointsAsPercentDisplay(vatEntry.rateBasisPoints),
    };
  } catch {
    return null;
  }
}

export function mapPublishedToSummary(
  version: PublishedFinancialSettingsVersion,
): PublishedVersionSummary {
  const vatSummary = version.vatSchedule
    .map(
      (row) =>
        `${jerusalemIsoDateFromInstant(row.effectiveFrom)}: ${formatBasisPointsAsPercentDisplay(row.rateBasisPoints)}%`,
    )
    .join(" · ");

  const grossDisplay = publishedAmountsUseGrossInclusiveDisplay(version.amounts);

  return {
    settingsVersionId: version.settingsVersionId,
    versionNumber: version.versionNumber,
    effectiveFromIso: jerusalemIsoDateFromInstant(version.effectiveFrom),
    publishedAtIso: version.publishedAt.toISOString(),
    amountsMonetaryBasis: version.amounts.amountsMonetaryBasis,
    debtorTreatmentFeeShekels: formatMinorUnitsAsShekels(
      debtorTreatmentFeePrimaryDisplayMinor(version.amounts),
    ),
    committeeAssumedTreatmentFeeShekels: formatMinorUnitsAsShekels(
      committeeTreatmentFeePrimaryDisplayMinor(version.amounts),
    ),
    debtorTreatmentFeeNetShekels: grossDisplay
      ? formatMinorUnitsAsShekels(version.amounts.debtorTreatmentFee!.net.amountMinor)
      : null,
    debtorTreatmentFeeVatShekels: grossDisplay
      ? formatMinorUnitsAsShekels(version.amounts.debtorTreatmentFee!.vat.amountMinor)
      : null,
    committeeAssumedTreatmentFeeNetShekels: grossDisplay
      ? formatMinorUnitsAsShekels(
          version.amounts.committeeTreatmentFeeWhenDebtorWaived!.net.amountMinor,
        )
      : null,
    committeeAssumedTreatmentFeeVatShekels: grossDisplay
      ? formatMinorUnitsAsShekels(
          version.amounts.committeeTreatmentFeeWhenDebtorWaived!.vat.amountMinor,
        )
      : null,
    trustAccountProcessingFeePercent: version.platformFees
      ? formatBasisPointsAsPercentDisplay(
          version.platformFees.trustAccountProcessingFeeBasisPoints,
        )
      : "—",
    committeeTransferFeePercent: version.platformFees
      ? formatBasisPointsAsPercentDisplay(version.platformFees.committeeTransferFeeBasisPoints)
      : "—",
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
    amountsMonetaryBasis?: string | null;
    amounts?: FinancialSettingsVersionAmounts | null;
    vatSchedule?: { effectiveFrom: Date; rateBasisPoints: number }[];
    escalation?: { recoveryFeeRateBasisPoints?: number };
    platformFees?: {
      trustAccountProcessingFeeBasisPoints?: number;
      committeeTransferFeeBasisPoints?: number;
    };
    notesInternal?: string | null;
    provenance?: { clonedFromSettingsVersionId?: string | null } | null;
  };
  publishedCount: number;
}): DraftViewModel {
  const clonedFrom = input.draft.provenance?.clonedFromSettingsVersionId ?? null;
  const showSuggestedValueHints = input.publishedCount === 0 && !clonedFrom;

  const basis = readAmountsMonetaryBasisFromDocument({
    amountsMonetaryBasis: input.draft.amountsMonetaryBasis,
    amounts: input.draft.amounts,
  });

  const requiresGrossAmountReentry = draftRequiresExplicitGrossAmountReentry(
    input.draft.amounts,
    basis,
  );

  const legacyDebtorNetShekels =
    !isGrossInclusiveVatBasis(basis) && input.draft.amounts?.debtorTreatmentFeeExVat
      ? formatMinorUnitsAsShekels(input.draft.amounts.debtorTreatmentFeeExVat.amountMinor)
      : null;
  const legacyCommitteeNetShekels =
    !isGrossInclusiveVatBasis(basis) && input.draft.amounts?.committeeTreatmentFeeWhenDebtorWaivedExVat
      ? formatMinorUnitsAsShekels(
          input.draft.amounts.committeeTreatmentFeeWhenDebtorWaivedExVat.amountMinor,
        )
      : null;

  const debtorTreatmentFeeShekels =
    isGrossInclusiveVatBasis(basis) && input.draft.amounts?.debtorTreatmentFeeGross
      ? formatMinorUnitsAsShekels(input.draft.amounts.debtorTreatmentFeeGross.amountMinor)
      : requiresGrossAmountReentry
        ? ""
        : legacyDebtorNetShekels ?? "";

  const committeeAssumedTreatmentFeeShekels =
    isGrossInclusiveVatBasis(basis) && input.draft.amounts?.committeeTreatmentFeeWhenDebtorWaivedGross
      ? formatMinorUnitsAsShekels(
          input.draft.amounts.committeeTreatmentFeeWhenDebtorWaivedGross.amountMinor,
        )
      : requiresGrossAmountReentry
        ? ""
        : legacyCommitteeNetShekels ?? "";

  return {
    settingsVersionId: input.draft.settingsVersionId,
    revision: input.draft.revision,
    currency: input.draft.currency,
    amountsMonetaryBasis: basis,
    requiresGrossAmountReentry,
    legacyDebtorNetShekels,
    legacyCommitteeNetShekels,
    debtorTreatmentFeeShekels,
    committeeAssumedTreatmentFeeShekels,
    trustAccountProcessingFeePercent:
      input.draft.platformFees?.trustAccountProcessingFeeBasisPoints != null
        ? formatBasisPointsAsPercentDisplay(
            input.draft.platformFees.trustAccountProcessingFeeBasisPoints,
          )
        : "",
    committeeTransferFeePercent:
      input.draft.platformFees?.committeeTransferFeeBasisPoints != null
        ? formatBasisPointsAsPercentDisplay(
            input.draft.platformFees.committeeTransferFeeBasisPoints,
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
