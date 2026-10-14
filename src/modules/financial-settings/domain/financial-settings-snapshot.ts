import type { CourtCostsPolicy } from "@/modules/financial-settings/domain/court-costs-policy";
import type { EscalationCalculationBase } from "@/modules/financial-settings/domain/escalation-calculation-base";
import type { CurrencyCode } from "@/shared/financial/currency";
import type { MoneyAmount } from "@/shared/financial/money.schema";

/** Shown in docs/types — snapshots are not legal or tax determinations. */
export const FINANCIAL_SETTINGS_SNAPSHOT_DISCLAIMER =
  "Configuration snapshot for operational consistency only. Not tax advice, statutory VAT determination, or filing output.";

export type FinancialSettingsVatScheduleEntrySnapshot = {
  effectiveFrom: Date;
  rateBasisPoints: number;
};

export type FinancialSettingsAmountsSnapshot = {
  debtorTreatmentFeeExVat: MoneyAmount;
  committeeTreatmentFeeWhenDebtorWaivedExVat: MoneyAmount;
};

export type FinancialSettingsEscalationSnapshot = {
  recoveryFeeRateBasisPoints: number;
  calculationBase: EscalationCalculationBase;
  courtCostsPolicy: CourtCostsPolicy;
};

export type FinancialSettingsSnapshot = {
  disclaimer: typeof FINANCIAL_SETTINGS_SNAPSHOT_DISCLAIMER;
  settingsVersionId: string;
  versionNumber: number;
  effectiveFrom: Date;
  publishedAt: Date;
  currency: CurrencyCode;
  amounts: FinancialSettingsAmountsSnapshot;
  escalation: FinancialSettingsEscalationSnapshot;
  /** VAT row selected by technical lookup at asOf — not a legal VAT ruling. */
  resolvedVatScheduleEntry: FinancialSettingsVatScheduleEntrySnapshot;
  materializedAt: Date;
  asOf: Date;
};
