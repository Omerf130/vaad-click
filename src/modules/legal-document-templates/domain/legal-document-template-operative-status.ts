/**
 * Explicit operativity — not a UI label alone.
 * `development_only` revisions cannot be approved or published for operative legal use.
 */
export const LegalDocumentTemplateOperativeStatus = {
  DEVELOPMENT_ONLY: "development_only",
  OPERATIVE_ELIGIBLE: "operative_eligible",
} as const;

export type LegalDocumentTemplateOperativeStatus =
  (typeof LegalDocumentTemplateOperativeStatus)[keyof typeof LegalDocumentTemplateOperativeStatus];

export function defaultOperativeStatusForCategory(
  category: string,
): LegalDocumentTemplateOperativeStatus {
  if (category === "statement_of_claim") {
    return LegalDocumentTemplateOperativeStatus.DEVELOPMENT_ONLY;
  }
  return LegalDocumentTemplateOperativeStatus.OPERATIVE_ELIGIBLE;
}

export function formatLegalDocumentTemplateOperativeStatusHe(
  status: LegalDocumentTemplateOperativeStatus,
): string {
  switch (status) {
    case LegalDocumentTemplateOperativeStatus.DEVELOPMENT_ONLY:
      return "פיתוח בלבד — לא מבצעי";
    case LegalDocumentTemplateOperativeStatus.OPERATIVE_ELIGIBLE:
      return "זכאי לשימוש מבצעי (לאחר אישור ופרסום)";
    default:
      return status;
  }
}