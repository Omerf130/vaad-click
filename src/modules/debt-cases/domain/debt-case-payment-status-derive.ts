import { DebtCasePaymentStatus } from "@/modules/debt-cases/domain/debt-case-payment-status";

/** Derive reported-payment status from ledger net and letter total (does not close workflow). */
export function deriveDebtCasePaymentStatus(input: {
  netReportedPaymentsMinor: number;
  outstandingBalanceMinor: number;
}): DebtCasePaymentStatus {
  if (input.netReportedPaymentsMinor <= 0) {
    return DebtCasePaymentStatus.NONE;
  }
  if (input.outstandingBalanceMinor <= 0) {
    return DebtCasePaymentStatus.FULL_REPORTED;
  }
  return DebtCasePaymentStatus.PARTIAL_REPORTED;
}