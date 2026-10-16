import { isGrossInclusiveVatBasis } from "@/modules/financial-settings/domain/amounts-monetary-basis";
import type { PublishedFinancialSettingsVersion } from "@/modules/financial-settings/domain/published-financial-settings-version";
import {
  WarningLetterMonetaryCompleteness,
} from "@/modules/warning-letters/domain/warning-letter-monetary-completeness";
import {
  WarningLetterError,
  WarningLetterErrorCode,
} from "@/modules/warning-letters/domain/warning-letter-errors";
import type { WarningLetterFinancialSnapshot } from "@/modules/warning-letters/snapshot/warning-letter-snapshot.types";

export function resolveWarningLetterFinancialSnapshot(input: {
  financialSettings: PublishedFinancialSettingsVersion | null;
  principalAmountMinor: number;
  treatmentFeeEligible: boolean;
  requireOperativeMonetaryData: boolean;
}): WarningLetterFinancialSnapshot {
  const {
    financialSettings,
    principalAmountMinor,
    treatmentFeeEligible,
    requireOperativeMonetaryData,
  } = input;

  if (!Number.isInteger(principalAmountMinor) || principalAmountMinor <= 0) {
    throw new WarningLetterError(
      WarningLetterErrorCode.MISSING_PRINCIPAL,
      "Principal amount must be a positive integer in agorot",
    );
  }

  if (!treatmentFeeEligible) {
    return {
      settingsVersionId: financialSettings?.settingsVersionId ?? null,
      monetaryCompleteness: WarningLetterMonetaryCompleteness.PRINCIPAL_ONLY,
      principalAmountMinor,
      treatmentFeeEligible: false,
      treatmentFeeGrossMinor: null,
      treatmentFeeNetMinor: null,
      treatmentFeeVatMinor: null,
      totalDueMinor: principalAmountMinor,
    };
  }

  if (!financialSettings) {
    if (requireOperativeMonetaryData) {
      throw new WarningLetterError(
        WarningLetterErrorCode.MISSING_PUBLISHED_FINANCIAL_SETTINGS,
        "Published financial settings are required when treatment fee is eligible",
      );
    }
    return {
      settingsVersionId: null,
      monetaryCompleteness:
        WarningLetterMonetaryCompleteness.INCOMPLETE_MISSING_PUBLISHED_SETTINGS,
      principalAmountMinor,
      treatmentFeeEligible: true,
      treatmentFeeGrossMinor: null,
      treatmentFeeNetMinor: null,
      treatmentFeeVatMinor: null,
      totalDueMinor: null,
    };
  }

  if (!isGrossInclusiveVatBasis(financialSettings.amounts.amountsMonetaryBasis)) {
    if (requireOperativeMonetaryData) {
      throw new WarningLetterError(
        WarningLetterErrorCode.INCOMPATIBLE_FINANCIAL_SETTINGS,
        "Published financial settings must use gross-inclusive VAT basis for warning letters",
      );
    }
    return {
      settingsVersionId: financialSettings.settingsVersionId,
      monetaryCompleteness:
        WarningLetterMonetaryCompleteness.INCOMPLETE_MISSING_PUBLISHED_SETTINGS,
      principalAmountMinor,
      treatmentFeeEligible: true,
      treatmentFeeGrossMinor: null,
      treatmentFeeNetMinor: null,
      treatmentFeeVatMinor: null,
      totalDueMinor: null,
    };
  }

  const fee = financialSettings.amounts.debtorTreatmentFee;
  if (!fee?.gross?.amountMinor) {
    if (requireOperativeMonetaryData) {
      throw new WarningLetterError(
        WarningLetterErrorCode.MISSING_TREATMENT_FEE_WHEN_ELIGIBLE,
        "Building is eligible for treatment fee but published settings lack debtorTreatmentFeeGross",
      );
    }
    return {
      settingsVersionId: financialSettings.settingsVersionId,
      monetaryCompleteness:
        WarningLetterMonetaryCompleteness.INCOMPLETE_MISSING_PUBLISHED_SETTINGS,
      principalAmountMinor,
      treatmentFeeEligible: true,
      treatmentFeeGrossMinor: null,
      treatmentFeeNetMinor: null,
      treatmentFeeVatMinor: null,
      totalDueMinor: null,
    };
  }

  const treatmentFeeGrossMinor = fee.gross.amountMinor;
  return {
    settingsVersionId: financialSettings.settingsVersionId,
    monetaryCompleteness: WarningLetterMonetaryCompleteness.COMPLETE,
    principalAmountMinor,
    treatmentFeeEligible: true,
    treatmentFeeGrossMinor,
    treatmentFeeNetMinor: fee.net.amountMinor,
    treatmentFeeVatMinor: fee.vat.amountMinor,
    totalDueMinor: principalAmountMinor + treatmentFeeGrossMinor,
  };
}
