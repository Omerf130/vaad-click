import "server-only";

import { CourtCostsPolicy } from "@/modules/financial-settings/domain/court-costs-policy";
import { EscalationCalculationBase } from "@/modules/financial-settings/domain/escalation-calculation-base";
import {
  FinancialSettingsError,
  FinancialSettingsErrorCode,
} from "@/modules/financial-settings/domain/financial-settings-errors";
import type { FinancialSettingsVersionDocument } from "@/modules/financial-settings/infra/financial-settings-version.model";
import type { PublishFinancialSettingsInput } from "@/modules/financial-settings/validation/financial-settings-content.schema";
import { CurrencyCode } from "@/shared/financial/currency";
import { jerusalemIsoDateFromInstant } from "@/shared/time/jerusalem-calendar";

type DraftLean = Pick<
  FinancialSettingsVersionDocument,
  | "currency"
  | "amounts"
  | "vatSchedule"
  | "escalation"
  | "notesInternal"
  | "revision"
>;

export function buildPublishPayloadFromSavedDraft(
  draft: DraftLean,
  effectiveFromIso: string,
): PublishFinancialSettingsInput {
  if (
    !draft.amounts?.debtorTreatmentFeeExVat ||
    !draft.amounts?.committeeTreatmentFeeWhenDebtorWaivedExVat
  ) {
    throw new FinancialSettingsError(
      FinancialSettingsErrorCode.VALIDATION,
      "Draft is missing treatment fee amounts",
    );
  }

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

  return {
    revision: draft.revision,
    effectiveFromIso,
    currency: (draft.currency ?? CurrencyCode.ILS) as CurrencyCode,
    amounts: {
      debtorTreatmentFeeExVat: {
        currency: draft.amounts.debtorTreatmentFeeExVat.currency as CurrencyCode,
        amountMinor: draft.amounts.debtorTreatmentFeeExVat.amountMinor,
      },
      committeeTreatmentFeeWhenDebtorWaivedExVat: {
        currency: draft.amounts.committeeTreatmentFeeWhenDebtorWaivedExVat
          .currency as CurrencyCode,
        amountMinor: draft.amounts.committeeTreatmentFeeWhenDebtorWaivedExVat.amountMinor,
      },
    },
    vatSchedule: draft.vatSchedule.map((entry) => ({
      effectiveFromIso: jerusalemIsoDateFromInstant(entry.effectiveFrom),
      rateBasisPoints: entry.rateBasisPoints,
    })),
    escalation: {
      recoveryFeeRateBasisPoints: draft.escalation.recoveryFeeRateBasisPoints,
      calculationBase:
        (draft.escalation.calculationBase as EscalationCalculationBase | undefined) ??
        EscalationCalculationBase.UNSPECIFIED,
      courtCostsPolicy:
        (draft.escalation.courtCostsPolicy as CourtCostsPolicy | undefined) ??
        CourtCostsPolicy.UNSPECIFIED,
    },
    notesInternal: draft.notesInternal ?? undefined,
  };
}
