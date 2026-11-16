import { DebtCasePaymentStatus } from "@/modules/debt-cases/domain/debt-case-payment-status";

export function formatDebtCasePaymentStatusHe(status: DebtCasePaymentStatus | string): string {
  switch (status) {
    case DebtCasePaymentStatus.NONE:
      return "לא דווח תשלום";
    case DebtCasePaymentStatus.PARTIAL_REPORTED:
      return "דווח תשלום חלקי";
    case DebtCasePaymentStatus.FULL_REPORTED:
      return "דווח כיסוי מלא (לפי תיעוד)";
    default:
      return status;
  }
}