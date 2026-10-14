import type { CourtCostsPolicy } from "@/modules/financial-settings/domain/court-costs-policy";
import type { EscalationCalculationBase } from "@/modules/financial-settings/domain/escalation-calculation-base";
import type { FinancialSettingsVersionDocument } from "@/modules/financial-settings/infra/financial-settings-version.model";
import { FinancialSettingsVersionStatus } from "@/modules/financial-settings/domain/financial-settings-version-status";
import {
  FinancialSettingsError,
  FinancialSettingsErrorCode,
} from "@/modules/financial-settings/domain/financial-settings-errors";
import type { CurrencyCode } from "@/shared/financial/currency";
import type { MoneyAmount } from "@/shared/financial/money.schema";

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
  amounts: {
    debtorTreatmentFeeExVat: MoneyAmount;
    committeeTreatmentFeeWhenDebtorWaivedExVat: MoneyAmount;
  };
  vatSchedule: VatScheduleEntry[];
  escalation: {
    recoveryFeeRateBasisPoints: number;
    calculationBase: EscalationCalculationBase;
    courtCostsPolicy: CourtCostsPolicy;
  };
};

export function toPublishedFinancialSettingsVersion(
  document: FinancialSettingsVersionDocument,
): PublishedFinancialSettingsVersion {
  if (document.status !== FinancialSettingsVersionStatus.PUBLISHED) {
    throw new FinancialSettingsError(
      FinancialSettingsErrorCode.SOURCE_NOT_PUBLISHED,
      "Financial settings version is not published",
    );
  }

  if (
    document.versionNumber == null ||
    !document.effectiveFrom ||
    !document.publishedAt ||
    !document.amounts?.debtorTreatmentFeeExVat ||
    !document.amounts?.committeeTreatmentFeeWhenDebtorWaivedExVat ||
    document.escalation?.recoveryFeeRateBasisPoints == null ||
    !document.escalation?.calculationBase ||
    !document.escalation?.courtCostsPolicy
  ) {
    throw new FinancialSettingsError(
      FinancialSettingsErrorCode.VALIDATION,
      "Published financial settings version is incomplete",
    );
  }

  return {
    settingsVersionId: document.settingsVersionId,
    versionNumber: document.versionNumber,
    effectiveFrom: document.effectiveFrom,
    publishedAt: document.publishedAt,
    currency: document.currency as CurrencyCode,
    amounts: {
      debtorTreatmentFeeExVat: document.amounts.debtorTreatmentFeeExVat as MoneyAmount,
      committeeTreatmentFeeWhenDebtorWaivedExVat:
        document.amounts.committeeTreatmentFeeWhenDebtorWaivedExVat as MoneyAmount,
    },
    vatSchedule: (document.vatSchedule ?? []).map((entry) => ({
      effectiveFrom: entry.effectiveFrom,
      rateBasisPoints: entry.rateBasisPoints,
    })),
    escalation: {
      recoveryFeeRateBasisPoints: document.escalation.recoveryFeeRateBasisPoints,
      calculationBase: document.escalation.calculationBase as EscalationCalculationBase,
      courtCostsPolicy: document.escalation.courtCostsPolicy as CourtCostsPolicy,
    },
  };
}
