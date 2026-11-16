export const DebtCaseDebtorResponseType = {
  NO_RESPONSE: "no_response",
  PAYMENT_REPORTED: "payment_reported",
  PAYMENT_ARRANGEMENT_REQUESTED: "payment_arrangement_requested",
  DEBT_DISPUTED: "debt_disputed",
  OTHER: "other",
} as const;

export type DebtCaseDebtorResponseType =
  (typeof DebtCaseDebtorResponseType)[keyof typeof DebtCaseDebtorResponseType];

export function formatDebtCaseDebtorResponseTypeHe(type: DebtCaseDebtorResponseType): string {
  switch (type) {
    case DebtCaseDebtorResponseType.NO_RESPONSE:
      return "אין תגובה";
    case DebtCaseDebtorResponseType.PAYMENT_REPORTED:
      return "דווח על תשלום";
    case DebtCaseDebtorResponseType.PAYMENT_ARRANGEMENT_REQUESTED:
      return "בקשה להסדר תשלום";
    case DebtCaseDebtorResponseType.DEBT_DISPUTED:
      return "הוכחת חוב — עורר ספק";
    case DebtCaseDebtorResponseType.OTHER:
      return "אחר";
    default:
      return type;
  }
}