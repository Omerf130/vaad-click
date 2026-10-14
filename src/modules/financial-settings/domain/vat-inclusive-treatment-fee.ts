import type { MoneyAmount } from "@/shared/financial/money.schema";

/** Frozen treatment fee triple after publish (or in snapshots). */
export type VatInclusiveTreatmentFeeAmounts = {
  gross: MoneyAmount;
  net: MoneyAmount;
  vat: MoneyAmount;
};

export function hasCompleteVatInclusiveTreatmentFee(
  gross: MoneyAmount | null | undefined,
  net: MoneyAmount | null | undefined,
  vat: MoneyAmount | null | undefined,
): gross is MoneyAmount {
  return (
    gross != null &&
    net != null &&
    vat != null &&
    typeof gross.amountMinor === "number" &&
    typeof net.amountMinor === "number" &&
    typeof vat.amountMinor === "number"
  );
}
