import { z } from "zod";

import { CollectionAllocationOrder } from "@/modules/financial-settings/domain/collection-allocation-order";
import { CourtCostsPolicy } from "@/modules/financial-settings/domain/court-costs-policy";
import { EscalationCalculationBase } from "@/modules/financial-settings/domain/escalation-calculation-base";
import { CONFIRMED_SUCCESS_FEE_EXCLUSIONS } from "@/modules/financial-settings/domain/success-fee-exclusion";
import { AmountsMonetaryBasis } from "@/modules/financial-settings/domain/amounts-monetary-basis";
import type { DraftFinancialSettingsContentInput } from "@/modules/financial-settings/validation/financial-settings-content.schema";
import { CurrencyCode } from "@/shared/financial/currency";
import {
  parsePercentStringToBasisPoints,
  parseShekelsStringToMinorUnits,
} from "@/shared/financial/decimal-string-parse";

const isoDateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "תאריך לא תקין");

export const draftFormFieldsSchema = z.object({
  revision: z.coerce.number().int().positive(),
  debtorTreatmentFeeShekels: z.string(),
  committeeAssumedTreatmentFeeShekels: z.string(),
  trustAccountProcessingFeePercent: z.string(),
  committeeTransferFeePercent: z.string(),
  escalationPercent: z.string(),
  notesInternal: z.string().max(2000).optional(),
});

export type DraftFormFields = z.infer<typeof draftFormFieldsSchema>;

export type VatFormRow = {
  effectiveFromIso: string;
  ratePercent: string;
};

export function parseVatFormRows(raw: string): VatFormRow[] {
  if (!raw.trim()) {
    return [];
  }
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error("VAT schedule invalid");
  }
  return parsed as VatFormRow[];
}

export function mapDraftFormToContentInput(input: {
  fields: DraftFormFields;
  vatRows: VatFormRow[];
}):
  | { ok: true; content: DraftFinancialSettingsContentInput; revision: number }
  | { ok: false; fieldErrors: Record<string, string[]> } {
  const fieldErrors: Record<string, string[]> = {};

  const debtor = parseShekelsStringToMinorUnits(input.fields.debtorTreatmentFeeShekels);
  if (!debtor.ok) {
    fieldErrors.debtorTreatmentFeeShekels = [debtor.messageHe];
  }

  const committee = parseShekelsStringToMinorUnits(input.fields.committeeAssumedTreatmentFeeShekels);
  if (!committee.ok) {
    fieldErrors.committeeAssumedTreatmentFeeShekels = [committee.messageHe];
  }

  const trustProcessing = parsePercentStringToBasisPoints(
    input.fields.trustAccountProcessingFeePercent,
  );
  if (!trustProcessing.ok) {
    fieldErrors.trustAccountProcessingFeePercent = [trustProcessing.messageHe];
  }

  const committeeTransfer = parsePercentStringToBasisPoints(
    input.fields.committeeTransferFeePercent,
  );
  if (!committeeTransfer.ok) {
    fieldErrors.committeeTransferFeePercent = [committeeTransfer.messageHe];
  }

  const escalation = parsePercentStringToBasisPoints(input.fields.escalationPercent);
  if (!escalation.ok) {
    fieldErrors.escalationPercent = [escalation.messageHe];
  }

  const vatSchedule: { effectiveFromIso: string; rateBasisPoints: number }[] = [];
  input.vatRows.forEach((row, index) => {
    const dateResult = isoDateField.safeParse(row.effectiveFromIso);
    if (!dateResult.success) {
      fieldErrors[`vat_${index}_date`] = ["תאריך לא תקין"];
    }
    const rate = parsePercentStringToBasisPoints(row.ratePercent);
    if (!rate.ok) {
      fieldErrors[`vat_${index}_rate`] = [rate.messageHe];
    }
    if (dateResult.success && rate.ok) {
      vatSchedule.push({
        effectiveFromIso: dateResult.data,
        rateBasisPoints: rate.scaledInteger,
      });
    }
  });

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  if (!debtor.ok || !committee.ok || !escalation.ok || !trustProcessing.ok || !committeeTransfer.ok) {
    return { ok: false, fieldErrors };
  }

  return {
    ok: true,
    revision: input.fields.revision,
    content: {
      currency: CurrencyCode.ILS,
      amountsMonetaryBasis: AmountsMonetaryBasis.GROSS_INCLUSIVE_VAT,
      amounts: {
        debtorTreatmentFeeGross: { currency: CurrencyCode.ILS, amountMinor: debtor.scaledInteger },
        committeeTreatmentFeeWhenDebtorWaivedGross: {
          currency: CurrencyCode.ILS,
          amountMinor: committee.scaledInteger,
        },
      },
      vatSchedule,
      platformFees: {
        trustAccountProcessingFeeBasisPoints: trustProcessing.scaledInteger,
        committeeTransferFeeBasisPoints: committeeTransfer.scaledInteger,
      },
      escalation: {
        recoveryFeeRateBasisPoints: escalation.scaledInteger,
        calculationBase:
          EscalationCalculationBase.COLLECTED_PRINCIPAL_AND_INDEXATION_INTEREST_AFTER_LAWSUIT_FILED,
        courtCostsPolicy: CourtCostsPolicy.UNSPECIFIED,
        successFeeExclusions: [...CONFIRMED_SUCCESS_FEE_EXCLUSIONS],
        collectionAllocationOrder: CollectionAllocationOrder.EXPENSES_THEN_PRINCIPAL,
      },
      notesInternal: input.fields.notesInternal,
    },
  };
}
