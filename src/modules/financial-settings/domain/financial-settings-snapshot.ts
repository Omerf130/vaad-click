import type { AmountsMonetaryBasis } from "@/modules/financial-settings/domain/amounts-monetary-basis";
import type { CollectionAllocationOrder } from "@/modules/financial-settings/domain/collection-allocation-order";
import type { CourtCostsPolicy } from "@/modules/financial-settings/domain/court-costs-policy";
import type { EscalationCalculationBase } from "@/modules/financial-settings/domain/escalation-calculation-base";
import type { PlatformFees } from "@/modules/financial-settings/domain/platform-fees";
import type { PublishedFinancialSettingsAmounts } from "@/modules/financial-settings/domain/financial-settings-amounts";
import type { SuccessFeeExclusion } from "@/modules/financial-settings/domain/success-fee-exclusion";
import type { CurrencyCode } from "@/shared/financial/currency";

/** Shown in docs/types — snapshots are not legal or tax determinations. */
export const FINANCIAL_SETTINGS_SNAPSHOT_DISCLAIMER =
  "Configuration snapshot for operational consistency only. Not tax advice, statutory VAT determination, or filing output.";

export type FinancialSettingsVatScheduleEntrySnapshot = {
  effectiveFrom: Date;
  rateBasisPoints: number;
};

export type FinancialSettingsEscalationSnapshot = {
  recoveryFeeRateBasisPoints: number;
  calculationBase: EscalationCalculationBase;
  courtCostsPolicy: CourtCostsPolicy;
  successFeeExclusions: SuccessFeeExclusion[];
  collectionAllocationOrder: CollectionAllocationOrder;
};

export type FinancialSettingsSnapshot = {
  disclaimer: typeof FINANCIAL_SETTINGS_SNAPSHOT_DISCLAIMER;
  settingsVersionId: string;
  versionNumber: number;
  effectiveFrom: Date;
  publishedAt: Date;
  currency: CurrencyCode;
  amountsMonetaryBasis: AmountsMonetaryBasis;
  amounts: PublishedFinancialSettingsAmounts;
  platformFees: PlatformFees;
  escalation: FinancialSettingsEscalationSnapshot;
  /** VAT row selected by technical lookup at asOf — not a legal VAT ruling. */
  resolvedVatScheduleEntry: FinancialSettingsVatScheduleEntrySnapshot;
  materializedAt: Date;
  asOf: Date;
};
