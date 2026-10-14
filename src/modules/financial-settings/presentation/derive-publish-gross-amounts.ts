import { AmountsMonetaryBasis } from "@/modules/financial-settings/domain/amounts-monetary-basis";
import {
  FinancialSettingsError,
  FinancialSettingsErrorCode,
} from "@/modules/financial-settings/domain/financial-settings-errors";
import type { FinancialSettingsVersionAmounts } from "@/modules/financial-settings/domain/financial-settings-amounts";
import {
  draftRequiresExplicitGrossAmountReentry,
  hasGrossDraftAmounts,
  readAmountsMonetaryBasisFromDocument,
} from "@/modules/financial-settings/domain/financial-settings-amounts";
import { resolveVatScheduleEntryForInstant } from "@/modules/financial-settings/domain/vat-schedule-resolution";
import type { PublishFinancialSettingsAmounts } from "@/modules/financial-settings/validation/financial-settings-content.schema";
import { CurrencyCode } from "@/shared/financial/currency";
import { deriveNetAndVatFromGrossMinor } from "@/shared/financial/vat-amount-breakdown";
import { startOfDayJerusalem } from "@/shared/time/jerusalem-calendar";

export function derivePublishAmountsFromGrossDraft(input: {
  currency: CurrencyCode;
  amounts: FinancialSettingsVersionAmounts | null | undefined;
  amountsMonetaryBasis?: string | null;
  vatSchedule: { effectiveFrom: Date; rateBasisPoints: number }[];
  effectiveFromIso: string;
}): PublishFinancialSettingsAmounts {
  const basis = readAmountsMonetaryBasisFromDocument({
    amountsMonetaryBasis: input.amountsMonetaryBasis,
    amounts: input.amounts,
  });

  if (draftRequiresExplicitGrossAmountReentry(input.amounts, basis)) {
    throw new FinancialSettingsError(
      FinancialSettingsErrorCode.LEGACY_DRAFT_REQUIRES_GROSS_AMOUNTS,
      "Draft must use VAT-inclusive gross treatment fees before publish",
    );
  }

  if (!hasGrossDraftAmounts(input.amounts)) {
    throw new FinancialSettingsError(
      FinancialSettingsErrorCode.VALIDATION,
      "Draft is missing gross treatment fee amounts",
    );
  }

  const effectiveFrom = startOfDayJerusalem(input.effectiveFromIso);
  const vatEntry = resolveVatScheduleEntryForInstant(input.vatSchedule, effectiveFrom);
  const rateBps = vatEntry.rateBasisPoints;

  const debtorGross = input.amounts!.debtorTreatmentFeeGross!.amountMinor;
  const committeeGross = input.amounts!.committeeTreatmentFeeWhenDebtorWaivedGross!.amountMinor;

  const debtorBreakdown = deriveNetAndVatFromGrossMinor({
    grossMinor: debtorGross,
    vatRateBasisPoints: rateBps,
  });
  const committeeBreakdown = deriveNetAndVatFromGrossMinor({
    grossMinor: committeeGross,
    vatRateBasisPoints: rateBps,
  });

  const money = (amountMinor: number) => ({
    currency: input.currency,
    amountMinor,
  });

  return {
    amountsMonetaryBasis: AmountsMonetaryBasis.GROSS_INCLUSIVE_VAT,
    debtorTreatmentFeeGross: money(debtorBreakdown.grossMinor),
    debtorTreatmentFeeNet: money(debtorBreakdown.netMinor),
    debtorTreatmentFeeVat: money(debtorBreakdown.vatMinor),
    committeeTreatmentFeeWhenDebtorWaivedGross: money(committeeBreakdown.grossMinor),
    committeeTreatmentFeeWhenDebtorWaivedNet: money(committeeBreakdown.netMinor),
    committeeTreatmentFeeWhenDebtorWaivedVat: money(committeeBreakdown.vatMinor),
    appliedVatRateBasisPoints: rateBps,
  };
}
