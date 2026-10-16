import { getTemplateVariantCatalogEntry } from "@/modules/warning-letters/domain/warning-letter-template-variant-catalog";

export function formatUnapprovedTemplateVariantHe(variantId: string): string {
  const entry = getTemplateVariantCatalogEntry(variantId);
  if (!entry) {
    return "קיים ניסוח משפטי שטרם אושר.";
  }
  if (entry.requiresLawyerClarification) {
    return `${entry.titleHe} — נדרשת הבהרה משפטית לפני אישור (אין ניסוח סמכותי במערכת).`;
  }
  return `${entry.titleHe} — טרם אושרה גרסת הניסוח (${entry.scenarioHe})`;
}
