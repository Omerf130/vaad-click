export const DebtCaseResolutionKind = {
  PAID_IN_FULL: "paid_in_full",
  SETTLED_BY_AGREEMENT: "settled_by_agreement",
  CLOSED_WITHOUT_COLLECTION: "closed_without_collection",
} as const;

export type DebtCaseResolutionKind =
  (typeof DebtCaseResolutionKind)[keyof typeof DebtCaseResolutionKind];

export function formatDebtCaseResolutionKindHe(kind: DebtCaseResolutionKind): string {
  switch (kind) {
    case DebtCaseResolutionKind.PAID_IN_FULL:
      return "שולם במלואו (תיעוד)";
    case DebtCaseResolutionKind.SETTLED_BY_AGREEMENT:
      return "הסדר מוסכם";
    case DebtCaseResolutionKind.CLOSED_WITHOUT_COLLECTION:
      return "נסגר ללא גבייה";
    default:
      return kind;
  }
}

export function resolutionRequiresReasonHe(kind: DebtCaseResolutionKind): boolean {
  return (
    kind === DebtCaseResolutionKind.SETTLED_BY_AGREEMENT ||
    kind === DebtCaseResolutionKind.CLOSED_WITHOUT_COLLECTION
  );
}