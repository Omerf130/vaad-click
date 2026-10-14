import type { CourtCostsPolicy } from "@/modules/financial-settings/domain/court-costs-policy";
import type { CollectionAllocationOrder } from "@/modules/financial-settings/domain/collection-allocation-order";
import type { EscalationCalculationBase } from "@/modules/financial-settings/domain/escalation-calculation-base";
import { isGrossInclusiveVatBasis } from "@/modules/financial-settings/domain/amounts-monetary-basis";
import {
  parsePublishedFinancialSettingsAmounts,
  readAmountsMonetaryBasisFromDocument,
  type PublishedFinancialSettingsAmounts,
} from "@/modules/financial-settings/domain/financial-settings-amounts";
import {
  hasCompletePlatformFees,
  type PlatformFees,
} from "@/modules/financial-settings/domain/platform-fees";
import type { SuccessFeeExclusion } from "@/modules/financial-settings/domain/success-fee-exclusion";
import type { FinancialSettingsVersionDocument } from "@/modules/financial-settings/infra/financial-settings-version.model";
import { FinancialSettingsVersionStatus } from "@/modules/financial-settings/domain/financial-settings-version-status";
import {
  FinancialSettingsError,
  FinancialSettingsErrorCode,
} from "@/modules/financial-settings/domain/financial-settings-errors";
import type { CurrencyCode } from "@/shared/financial/currency";

export type VatScheduleEntry = {
  effectiveFrom: Date;
  rateBasisPoints: number;
};

export type PublishedFinancialSettingsVersion = {
  settingsVersionId: string;
  versionNumber: number;
  effectiveFrom: Date;
  publishedAt: Date;
  currency: CurrencyCode;
  amounts: PublishedFinancialSettingsAmounts;
  vatSchedule: VatScheduleEntry[];
  escalation: {
    recoveryFeeRateBasisPoints: number;
    calculationBase: EscalationCalculationBase;
    courtCostsPolicy: CourtCostsPolicy;
    successFeeExclusions?: SuccessFeeExclusion[];
    collectionAllocationOrder?: CollectionAllocationOrder;
  };
  /** Present on versions published after CP6D; absent on legacy published rows. */
  platformFees?: PlatformFees;
};

export function publishedVersionSupportsProposedEngagementTerms(
  version: PublishedFinancialSettingsVersion,
): boolean {
  return hasCompletePlatformFees(version.platformFees);
}

function publishedDocumentHasRequiredAmounts(
  document: FinancialSettingsVersionDocument,
  basis: ReturnType<typeof readAmountsMonetaryBasisFromDocument>,
): boolean {
  const amounts = document.amounts;
  if (isGrossInclusiveVatBasis(basis)) {
    return (
      amounts?.debtorTreatmentFeeGross != null &&
      amounts?.debtorTreatmentFeeNet != null &&
      amounts?.debtorTreatmentFeeVat != null &&
      amounts?.committeeTreatmentFeeWhenDebtorWaivedGross != null &&
      amounts?.committeeTreatmentFeeWhenDebtorWaivedNet != null &&
      amounts?.committeeTreatmentFeeWhenDebtorWaivedVat != null
    );
  }
  return (
    amounts?.debtorTreatmentFeeExVat != null &&
    amounts?.committeeTreatmentFeeWhenDebtorWaivedExVat != null
  );
}

export function toPublishedFinancialSettingsVersion(
  document: FinancialSettingsVersionDocument,
): PublishedFinancialSettingsVersion {
  if (document.status !== FinancialSettingsVersionStatus.PUBLISHED) {
    throw new FinancialSettingsError(
      FinancialSettingsErrorCode.SOURCE_NOT_PUBLISHED,
      "Financial settings version is not published",
    );
  }

  const basis = readAmountsMonetaryBasisFromDocument(document);

  if (
    document.versionNumber == null ||
    !document.effectiveFrom ||
    !document.publishedAt ||
    !publishedDocumentHasRequiredAmounts(document, basis) ||
    document.escalation?.recoveryFeeRateBasisPoints == null ||
    !document.escalation?.calculationBase ||
    !document.escalation?.courtCostsPolicy
  ) {
    throw new FinancialSettingsError(
      FinancialSettingsErrorCode.VALIDATION,
      "Published financial settings version is incomplete",
    );
  }

  const currency = document.currency as CurrencyCode;

  return {
    settingsVersionId: document.settingsVersionId,
    versionNumber: document.versionNumber,
    effectiveFrom: document.effectiveFrom,
    publishedAt: document.publishedAt,
    currency,
    amounts: parsePublishedFinancialSettingsAmounts(document.amounts, basis, currency),
    vatSchedule: (document.vatSchedule ?? []).map((entry) => ({
      effectiveFrom: entry.effectiveFrom,
      rateBasisPoints: entry.rateBasisPoints,
    })),
    escalation: {
      recoveryFeeRateBasisPoints: document.escalation.recoveryFeeRateBasisPoints,
      calculationBase: document.escalation.calculationBase as EscalationCalculationBase,
      courtCostsPolicy: document.escalation.courtCostsPolicy as CourtCostsPolicy,
      successFeeExclusions: document.escalation.successFeeExclusions as
        | SuccessFeeExclusion[]
        | undefined,
      collectionAllocationOrder: document.escalation.collectionAllocationOrder as
        | CollectionAllocationOrder
        | undefined,
    },
    platformFees: (() => {
      const raw = document.platformFees;
      if (
        raw &&
        typeof raw.trustAccountProcessingFeeBasisPoints === "number" &&
        typeof raw.committeeTransferFeeBasisPoints === "number"
      ) {
        return {
          trustAccountProcessingFeeBasisPoints: raw.trustAccountProcessingFeeBasisPoints,
          committeeTransferFeeBasisPoints: raw.committeeTransferFeeBasisPoints,
        };
      }
      return undefined;
    })(),
  };
}
