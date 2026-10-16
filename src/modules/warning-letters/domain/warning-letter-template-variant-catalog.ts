import { WarningLetterUnapprovedTemplateVariant } from "@/modules/warning-letters/domain/warning-letter-unapproved-template-variant";
import {
  INITIAL_WARNING_FIXED_CLAUSES,
  INITIAL_WARNING_INTRO_TEMPLATES,
  INITIAL_WARNING_MC_MAINTENANCE_CLAUSE,
  INITIAL_WARNING_OCCUPANCY_CLAUSES,
  INITIAL_WARNING_PAYMENT_BLOCK_INCOMPLETE,
  INITIAL_WARNING_PAYMENT_BLOCK_NO_TREATMENT,
} from "@/modules/warning-letters/templates/initial-warning-clause-manifest";
import { INITIAL_WARNING_TEMPLATE_VERSION_ID } from "@/modules/warning-letters/domain/warning-letter-type";

export type WarningLetterTemplateVariantCatalogEntry = {
  variantId: string;
  templateVersionId: string;
  titleHe: string;
  scenarioHe: string;
  /** Authoritative manifest wording (may include placeholders). */
  wordingHe: string;
  requiresLawyerClarification: boolean;
};

function joinWording(parts: readonly string[]): string {
  return parts.filter(Boolean).join("\n\n");
}

export const WARNING_LETTER_TEMPLATE_VARIANT_CATALOG: readonly WarningLetterTemplateVariantCatalogEntry[] =
  [
    {
      variantId: WarningLetterUnapprovedTemplateVariant.MANAGEMENT_COMPANY_INTRO,
      templateVersionId: INITIAL_WARNING_TEMPLATE_VERSION_ID,
      titleHe: "פתיחת מכתב — חברת ניהול",
      scenarioHe: "כאשר מרשתי היא חברת הניהול (לא נציגות ישירה).",
      wordingHe: INITIAL_WARNING_INTRO_TEMPLATES.management_company.template,
      requiresLawyerClarification: false,
    },
    {
      variantId: WarningLetterUnapprovedTemplateVariant.COMMITTEE_INTRO,
      templateVersionId: INITIAL_WARNING_TEMPLATE_VERSION_ID,
      titleHe: "פתיחת מכתב — נציגות הבית",
      scenarioHe: "כאשר מרשתי היא נציגות הבית המשותף (ללא חברת ניהול כמרשה).",
      wordingHe: INITIAL_WARNING_INTRO_TEMPLATES.committee.template,
      requiresLawyerClarification: false,
    },
    {
      variantId: WarningLetterUnapprovedTemplateVariant.OCCUPANCY_SPLIT_BRANCHES,
      templateVersionId: INITIAL_WARNING_TEMPLATE_VERSION_ID,
      titleHe: "ענפי ניסוח — בעלות / שכירות / חברת ניהול",
      scenarioHe: "בחירת ניסוח לפי סוג מחזיק (בעלים יחיד, בעלים משותפים, שוכר/ת) ותפקיד חברת הניהול.",
      wordingHe: joinWording([
        INITIAL_WARNING_OCCUPANCY_CLAUSES.owner_single.template,
        INITIAL_WARNING_OCCUPANCY_CLAUSES.owner_joint.template,
        INITIAL_WARNING_OCCUPANCY_CLAUSES.tenant.template,
        INITIAL_WARNING_MC_MAINTENANCE_CLAUSE.template,
      ]),
      requiresLawyerClarification: false,
    },
    {
      variantId: WarningLetterUnapprovedTemplateVariant.PRINTED_DEADLINE_WITHOUT_TREATMENT,
      templateVersionId: INITIAL_WARNING_TEMPLATE_VERSION_ID,
      titleHe: "מועד אחרון מודפס (ללא הוצאות טיפול בגוף הסעיף)",
      scenarioHe: "כאשר בניין/תיק אינו כולל הוצאות טיפול לחייב — סעיף איום בתביעה עם תאריך מפורש.",
      wordingHe: INITIAL_WARNING_FIXED_CLAUSES.printed_deadline_lawsuit.template,
      requiresLawyerClarification: false,
    },
    {
      variantId: WarningLetterUnapprovedTemplateVariant.PAYMENT_BLOCK_MANIFEST,
      templateVersionId: INITIAL_WARNING_TEMPLATE_VERSION_ID,
      titleHe: "בלוק הנחיות תשלום",
      scenarioHe: "ניסוחי בלוק התשלום (עם/בלי הוצאות טיפול; תצוגה שלמה/לא שלמה).",
      wordingHe: joinWording([
        INITIAL_WARNING_FIXED_CLAUSES.payment_block.template,
        INITIAL_WARNING_PAYMENT_BLOCK_NO_TREATMENT,
        INITIAL_WARNING_PAYMENT_BLOCK_INCOMPLETE,
      ]),
      requiresLawyerClarification: false,
    },
  ];

export function getTemplateVariantCatalogEntry(
  variantId: string,
): WarningLetterTemplateVariantCatalogEntry | null {
  return (
    WARNING_LETTER_TEMPLATE_VARIANT_CATALOG.find((entry) => entry.variantId === variantId) ??
    null
  );
}
