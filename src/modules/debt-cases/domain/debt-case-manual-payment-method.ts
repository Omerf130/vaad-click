export const DebtCaseManualPaymentMethod = {
  BANK_TRANSFER: "bank_transfer",
  CASH: "cash",
  CHECK: "check",
  CARD: "card",
  OTHER: "other",
} as const;

export type DebtCaseManualPaymentMethod =
  (typeof DebtCaseManualPaymentMethod)[keyof typeof DebtCaseManualPaymentMethod];

export function formatDebtCaseManualPaymentMethodHe(
  method: DebtCaseManualPaymentMethod,
): string {
  switch (method) {
    case DebtCaseManualPaymentMethod.BANK_TRANSFER:
      return "העברה בנקאית";
    case DebtCaseManualPaymentMethod.CASH:
      return "מזומן";
    case DebtCaseManualPaymentMethod.CHECK:
      return "שיק";
    case DebtCaseManualPaymentMethod.CARD:
      return "כרטיס אשראי";
    case DebtCaseManualPaymentMethod.OTHER:
      return "אחר";
    default:
      return method;
  }
}