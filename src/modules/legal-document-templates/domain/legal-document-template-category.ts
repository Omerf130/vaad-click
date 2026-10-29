export const LegalDocumentTemplateCategory = {
  POWER_OF_ATTORNEY: "power_of_attorney",
  FEE_AGREEMENT: "fee_agreement",
  DECLARATION: "declaration",
} as const;

export type LegalDocumentTemplateCategory =
  (typeof LegalDocumentTemplateCategory)[keyof typeof LegalDocumentTemplateCategory];

export const LEGAL_DOCUMENT_TEMPLATE_CATEGORY_VALUES: readonly LegalDocumentTemplateCategory[] =
  Object.values(LegalDocumentTemplateCategory);

const CATEGORY_LABELS_HE: Record<LegalDocumentTemplateCategory, string> = {
  [LegalDocumentTemplateCategory.POWER_OF_ATTORNEY]: "ייפוי כוח",
  [LegalDocumentTemplateCategory.FEE_AGREEMENT]: "הסכם שכר טרחה",
  [LegalDocumentTemplateCategory.DECLARATION]: "הצהרה",
};

export function isLegalDocumentTemplateCategory(value: string): value is LegalDocumentTemplateCategory {
  return (LEGAL_DOCUMENT_TEMPLATE_CATEGORY_VALUES as readonly string[]).includes(value);
}

export function legalDocumentTemplateCategoryLabelHe(
  category: LegalDocumentTemplateCategory,
): string {
  return CATEGORY_LABELS_HE[category];
}
