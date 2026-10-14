import {
  AmountsMonetaryBasis,
  isGrossInclusiveVatBasis,
  normalizeAmountsMonetaryBasis,
} from "@/modules/financial-settings/domain/amounts-monetary-basis";
import {
  hasCompleteVatInclusiveTreatmentFee,
  type VatInclusiveTreatmentFeeAmounts,
} from "@/modules/financial-settings/domain/vat-inclusive-treatment-fee";
import type { CurrencyCode } from "@/shared/financial/currency";
import type { MoneyAmount } from "@/shared/financial/money.schema";

/** Amounts block as stored on a version document or snapshot payload. */
export type FinancialSettingsVersionAmounts = {
  amountsMonetaryBasis?: AmountsMonetaryBasis | string | null;
  debtorTreatmentFeeExVat?: MoneyAmount | null;
  committeeTreatmentFeeWhenDebtorWaivedExVat?: MoneyAmount | null;
  debtorTreatmentFeeGross?: MoneyAmount | null;
  debtorTreatmentFeeNet?: MoneyAmount | null;
  debtorTreatmentFeeVat?: MoneyAmount | null;
  committeeTreatmentFeeWhenDebtorWaivedGross?: MoneyAmount | null;
  committeeTreatmentFeeWhenDebtorWaivedNet?: MoneyAmount | null;
  committeeTreatmentFeeWhenDebtorWaivedVat?: MoneyAmount | null;
};

export type PublishedFinancialSettingsAmounts = {
  amountsMonetaryBasis: AmountsMonetaryBasis;
  debtorTreatmentFeeExVat?: MoneyAmount;
  committeeTreatmentFeeWhenDebtorWaivedExVat?: MoneyAmount;
  debtorTreatmentFee?: VatInclusiveTreatmentFeeAmounts;
  committeeTreatmentFeeWhenDebtorWaived?: VatInclusiveTreatmentFeeAmounts;
};

export function readAmountsMonetaryBasisFromDocument(
  document: { amountsMonetaryBasis?: string | null; amounts?: FinancialSettingsVersionAmounts | null },
): AmountsMonetaryBasis {
  const fromRoot = document.amountsMonetaryBasis;
  if (fromRoot) {
    return normalizeAmountsMonetaryBasis(fromRoot);
  }
  const fromAmounts = document.amounts?.amountsMonetaryBasis;
  return normalizeAmountsMonetaryBasis(fromAmounts);
}

export function draftRequiresExplicitGrossAmountReentry(
  amounts: FinancialSettingsVersionAmounts | null | undefined,
  rootBasis: AmountsMonetaryBasis,
): boolean {
  if (isGrossInclusiveVatBasis(rootBasis)) {
    return !hasGrossDraftAmounts(amounts);
  }
  return true;
}

export function hasGrossDraftAmounts(
  amounts: FinancialSettingsVersionAmounts | null | undefined,
): boolean {
  return (
    amounts?.debtorTreatmentFeeGross != null &&
    amounts?.committeeTreatmentFeeWhenDebtorWaivedGross != null
  );
}

export function parsePublishedFinancialSettingsAmounts(
  raw: FinancialSettingsVersionAmounts | null | undefined,
  rootBasis: AmountsMonetaryBasis,
  currency: CurrencyCode,
): PublishedFinancialSettingsAmounts {
  const basis = raw?.amountsMonetaryBasis
    ? normalizeAmountsMonetaryBasis(raw.amountsMonetaryBasis)
    : rootBasis;

  if (isGrossInclusiveVatBasis(basis)) {
    if (
      !hasCompleteVatInclusiveTreatmentFee(
        raw?.debtorTreatmentFeeGross,
        raw?.debtorTreatmentFeeNet,
        raw?.debtorTreatmentFeeVat,
      ) ||
      !hasCompleteVatInclusiveTreatmentFee(
        raw?.committeeTreatmentFeeWhenDebtorWaivedGross,
        raw?.committeeTreatmentFeeWhenDebtorWaivedNet,
        raw?.committeeTreatmentFeeWhenDebtorWaivedVat,
      )
    ) {
      throw new Error("Gross-inclusive published amounts are incomplete");
    }

    return {
      amountsMonetaryBasis: basis,
      debtorTreatmentFee: {
        gross: raw.debtorTreatmentFeeGross!,
        net: raw.debtorTreatmentFeeNet!,
        vat: raw.debtorTreatmentFeeVat!,
      },
      committeeTreatmentFeeWhenDebtorWaived: {
        gross: raw.committeeTreatmentFeeWhenDebtorWaivedGross!,
        net: raw.committeeTreatmentFeeWhenDebtorWaivedNet!,
        vat: raw.committeeTreatmentFeeWhenDebtorWaivedVat!,
      },
    };
  }

  if (!raw?.debtorTreatmentFeeExVat || !raw?.committeeTreatmentFeeWhenDebtorWaivedExVat) {
    throw new Error("Legacy published amounts are incomplete");
  }

  if (raw.debtorTreatmentFeeExVat.currency !== currency) {
    throw new Error("Debtor treatment fee currency mismatch");
  }

  return {
    amountsMonetaryBasis: AmountsMonetaryBasis.LEGACY_NET_EXCLUSIVE_VAT,
    debtorTreatmentFeeExVat: raw.debtorTreatmentFeeExVat,
    committeeTreatmentFeeWhenDebtorWaivedExVat: raw.committeeTreatmentFeeWhenDebtorWaivedExVat,
  };
}

/** Primary display minor units for treatment fees — gross when available, else legacy net. */
export function debtorTreatmentFeePrimaryDisplayMinor(
  amounts: PublishedFinancialSettingsAmounts,
): number {
  if (amounts.debtorTreatmentFee) {
    return amounts.debtorTreatmentFee.gross.amountMinor;
  }
  return amounts.debtorTreatmentFeeExVat!.amountMinor;
}

export function committeeTreatmentFeePrimaryDisplayMinor(
  amounts: PublishedFinancialSettingsAmounts,
): number {
  if (amounts.committeeTreatmentFeeWhenDebtorWaived) {
    return amounts.committeeTreatmentFeeWhenDebtorWaived.gross.amountMinor;
  }
  return amounts.committeeTreatmentFeeWhenDebtorWaivedExVat!.amountMinor;
}

export function publishedAmountsUseGrossInclusiveDisplay(
  amounts: PublishedFinancialSettingsAmounts,
): boolean {
  return isGrossInclusiveVatBasis(amounts.amountsMonetaryBasis);
}
