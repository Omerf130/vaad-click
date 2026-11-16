export const LegalDocumentTemplateCategory = {
  POWER_OF_ATTORNEY: "power_of_attorney",
  FEE_AGREEMENT: "fee_agreement",
  DECLARATION: "declaration",
  STATEMENT_OF_CLAIM: "statement_of_claim",
} as const;

export type LegalDocumentTemplateCategory =
  (typeof LegalDocumentTemplateCategory)[keyof typeof LegalDocumentTemplateCategory];

export const LEGAL_DOCUMENT_TEMPLATE_CATEGORY_VALUES: readonly LegalDocumentTemplateCategory[] =
  Object.values(LegalDocumentTemplateCategory);

/** Templates used for per-building onboarding documents (excludes case-level claim template). */
export const BUILDING_LEGAL_DOCUMENT_TEMPLATE_CATEGORIES: readonly LegalDocumentTemplateCategory[] =
  [
    LegalDocumentTemplateCategory.POWER_OF_ATTORNEY,
    LegalDocumentTemplateCategory.FEE_AGREEMENT,
    LegalDocumentTemplateCategory.DECLARATION,
  ];

const CATEGORY_LABELS_HE: Record<LegalDocumentTemplateCategory, string> = {
  [LegalDocumentTemplateCategory.POWER_OF_ATTORNEY]: "ייפוי כוח",
  [LegalDocumentTemplateCategory.FEE_AGREEMENT]: "הסכם שכר טרחה",
  [LegalDocumentTemplateCategory.DECLARATION]: "הצהרה",
  [LegalDocumentTemplateCategory.STATEMENT_OF_CLAIM]: "כתב תביעה",
};

/** Categories whose body is structured JSON (statement-of-claim sections). */
export function isStructuredLegalDocumentTemplateCategory(
  category: LegalDocumentTemplateCategory,
): boolean {
  return category === LegalDocumentTemplateCategory.STATEMENT_OF_CLAIM;
}

export function isLegalDocumentTemplateCategory(value: string): value is LegalDocumentTemplateCategory {
  return (LEGAL_DOCUMENT_TEMPLATE_CATEGORY_VALUES as readonly string[]).includes(value);
}

export function legalDocumentTemplateCategoryLabelHe(
  category: LegalDocumentTemplateCategory,
): string {
  return CATEGORY_LABELS_HE[category];
}
