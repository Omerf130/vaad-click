import { countMonthsInclusive, type DebtPeriodMonth } from "@/modules/debt-cases/domain/debt-period";
import {
  DebtCaseValidationFlagCode,
  DebtCaseValidationFlagSeverity,
  type DebtCaseValidationFlag,
} from "@/modules/debt-cases/domain/debt-case-validation-flag";

/**
 * Future configurable amount-anomaly policy (lawyer-approved parameters only).
 * CP8.1A: no default policy — warnings are not emitted unless explicitly configured.
 */
export type DebtCaseAmountAnomalyPolicy = {
  enabled: true;
  /** Flag when principal exceeds (months × building average × this multiple). */
  maxMultipleOfBuildingAverage: number;
};

export const DEBT_CASE_AMOUNT_ANOMALY_POLICY_UNCONFIGURED = {
  enabled: false,
} as const;

export type DebtCaseAmountAnomalyPolicyInput =
  | typeof DEBT_CASE_AMOUNT_ANOMALY_POLICY_UNCONFIGURED
  | DebtCaseAmountAnomalyPolicy;

export function evaluateConfiguredAmountAnomalyFlag(input: {
  principalAmountMinor: number;
  periodStartMonth: DebtPeriodMonth;
  periodEndMonth: DebtPeriodMonth;
  buildingAverageMonthlyVaadFeeMinor: number | null | undefined;
  policy: DebtCaseAmountAnomalyPolicyInput | null | undefined;
}): DebtCaseValidationFlag | null {
  if (!input.policy || input.policy.enabled !== true) {
    return null;
  }

  const average = input.buildingAverageMonthlyVaadFeeMinor;
  if (average == null || average <= 0) {
    return null;
  }

  const months = countMonthsInclusive({
    periodStartMonth: input.periodStartMonth,
    periodEndMonth: input.periodEndMonth,
  });
  const expected = months * average;
  if (expected <= 0) {
    return null;
  }

  if (input.principalAmountMinor > expected * input.policy.maxMultipleOfBuildingAverage) {
    return {
      code: DebtCaseValidationFlagCode.AMOUNT_ABOVE_BUILDING_AVERAGE,
      severity: DebtCaseValidationFlagSeverity.WARN,
      messageHe: "סכום החוב גבוה משמעותית מדמי הוועד הממוצעים לתקופה — נדרשת בדיקה",
    };
  }

  return null;
}
