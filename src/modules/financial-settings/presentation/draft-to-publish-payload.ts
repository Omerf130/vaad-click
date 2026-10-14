import "server-only";

import { CollectionAllocationOrder } from "@/modules/financial-settings/domain/collection-allocation-order";
import { CourtCostsPolicy } from "@/modules/financial-settings/domain/court-costs-policy";
import { EscalationCalculationBase } from "@/modules/financial-settings/domain/escalation-calculation-base";
import {
  FinancialSettingsError,
  FinancialSettingsErrorCode,
} from "@/modules/financial-settings/domain/financial-settings-errors";
import type { FinancialSettingsVersionAmounts } from "@/modules/financial-settings/domain/financial-settings-amounts";
import {
  CONFIRMED_SUCCESS_FEE_EXCLUSIONS,
  type SuccessFeeExclusion,
} from "@/modules/financial-settings/domain/success-fee-exclusion";
import { derivePublishAmountsFromGrossDraft } from "@/modules/financial-settings/presentation/derive-publish-gross-amounts";
import type { PublishFinancialSettingsInput } from "@/modules/financial-settings/validation/financial-settings-content.schema";
import { CurrencyCode } from "@/shared/financial/currency";
import { jerusalemIsoDateFromInstant } from "@/shared/time/jerusalem-calendar";

export type SavedFinancialSettingsDraftForPublish = {
  revision: number;
  currency?: CurrencyCode | string;
  amountsMonetaryBasis?: string | null;
  amounts?: FinancialSettingsVersionAmounts | null;
  vatSchedule?: { effectiveFrom: Date; rateBasisPoints: number }[];
  escalation?: {
    recoveryFeeRateBasisPoints?: number;
    calculationBase?: string;
    courtCostsPolicy?: string;
    successFeeExclusions?: string[];
    collectionAllocationOrder?: string;
  };
  platformFees?: {
    trustAccountProcessingFeeBasisPoints?: number | null;
    committeeTransferFeeBasisPoints?: number | null;
  };
  notesInternal?: string | null;
};

export function buildPublishPayloadFromSavedDraft(
  draft: SavedFinancialSettingsDraftForPublish,
  effectiveFromIso: string,
): PublishFinancialSettingsInput {
  if (!draft.vatSchedule?.length) {
    throw new FinancialSettingsError(
      FinancialSettingsErrorCode.VALIDATION,
      "Draft is missing VAT schedule",
    );
  }

  if (draft.escalation?.recoveryFeeRateBasisPoints == null) {
    throw new FinancialSettingsError(
      FinancialSettingsErrorCode.VALIDATION,
      "Draft is missing escalation percentage",
    );
  }

  const draftPlatformFees = draft.platformFees;
  if (
    !draftPlatformFees ||
    typeof draftPlatformFees.trustAccountProcessingFeeBasisPoints !== "number" ||
    typeof draftPlatformFees.committeeTransferFeeBasisPoints !== "number"
  ) {
    throw new FinancialSettingsError(
      FinancialSettingsErrorCode.VALIDATION,
      "Draft is missing platform fee rates",
    );
  }

  const calculationBase =
    (draft.escalation.calculationBase as EscalationCalculationBase | undefined) ??
    EscalationCalculationBase.UNSPECIFIED;
  const collectionAllocationOrder =
    (draft.escalation.collectionAllocationOrder as CollectionAllocationOrder | undefined) ??
    CollectionAllocationOrder.UNSPECIFIED;
  const successFeeExclusions: SuccessFeeExclusion[] =
    draft.escalation.successFeeExclusions && draft.escalation.successFeeExclusions.length > 0
      ? (draft.escalation.successFeeExclusions as SuccessFeeExclusion[])
      : [...CONFIRMED_SUCCESS_FEE_EXCLUSIONS];

  const currency = (draft.currency ?? CurrencyCode.ILS) as CurrencyCode;
  const amounts = derivePublishAmountsFromGrossDraft({
    currency,
    amounts: draft.amounts,
    amountsMonetaryBasis: draft.amountsMonetaryBasis,
    vatSchedule: draft.vatSchedule,
    effectiveFromIso,
  });

  return {
    revision: draft.revision,
    effectiveFromIso,
    currency,
    amounts,
    vatSchedule: draft.vatSchedule.map((entry) => ({
      effectiveFromIso: jerusalemIsoDateFromInstant(entry.effectiveFrom),
      rateBasisPoints: entry.rateBasisPoints,
    })),
    escalation: {
      recoveryFeeRateBasisPoints: draft.escalation.recoveryFeeRateBasisPoints,
      calculationBase,
      courtCostsPolicy:
        (draft.escalation.courtCostsPolicy as CourtCostsPolicy | undefined) ??
        CourtCostsPolicy.UNSPECIFIED,
      successFeeExclusions,
      collectionAllocationOrder,
    },
    platformFees: {
      trustAccountProcessingFeeBasisPoints:
        draftPlatformFees.trustAccountProcessingFeeBasisPoints,
      committeeTransferFeeBasisPoints: draftPlatformFees.committeeTransferFeeBasisPoints,
    },
    notesInternal: draft.notesInternal ?? undefined,
  };
}
