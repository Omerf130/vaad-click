import { AmountsMonetaryBasis } from "@/modules/financial-settings/domain/amounts-monetary-basis";
import type { PublishFinancialSettingsAmounts } from "@/modules/financial-settings/validation/financial-settings-content.schema";

/** 118.00 ₪ gross at 18% VAT → 100.00 net + 18.00 VAT */
export const SAMPLE_GROSS_PUBLISH_AMOUNTS: PublishFinancialSettingsAmounts = {
  amountsMonetaryBasis: AmountsMonetaryBasis.GROSS_INCLUSIVE_VAT,
  debtorTreatmentFeeGross: { currency: "ILS", amountMinor: 11_800 },
  debtorTreatmentFeeNet: { currency: "ILS", amountMinor: 10_000 },
  debtorTreatmentFeeVat: { currency: "ILS", amountMinor: 1_800 },
  committeeTreatmentFeeWhenDebtorWaivedGross: { currency: "ILS", amountMinor: 23_600 },
  committeeTreatmentFeeWhenDebtorWaivedNet: { currency: "ILS", amountMinor: 20_000 },
  committeeTreatmentFeeWhenDebtorWaivedVat: { currency: "ILS", amountMinor: 3_600 },
  appliedVatRateBasisPoints: 1800,
};

export const SAMPLE_LEGACY_PUBLISHED_AMOUNTS = {
  amountsMonetaryBasis: AmountsMonetaryBasis.LEGACY_NET_EXCLUSIVE_VAT,
  debtorTreatmentFeeExVat: { currency: "ILS" as const, amountMinor: 100 },
  committeeTreatmentFeeWhenDebtorWaivedExVat: { currency: "ILS" as const, amountMinor: 200 },
};
