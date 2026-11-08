import { legalDocuments } from "@/content/legal-pages";

/**
 * Registration consent UI is informational until legal documents are approved.
 * No server-side consent field is collected in CP10.
 */
export const registrationConsentState = {
  status: "informational_only" as const,
  notice:
    "לפני יצירת חשבון מומלץ לעיין בתנאי השימוש ובמדיניות הפרטיות. יצירת חשבון כאן אינה מחליפה חתימה על הסכם שכר הטרחה או ייפוי הכוח במסגרת ההצטרפות למשרד.",
  privacyPath: legalDocuments.privacy.path,
  termsPath: legalDocuments.terms.path,
};
