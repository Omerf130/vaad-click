import { legalDocuments } from "@/content/legal-pages";

/**
 * Registration consent UI is informational until legal documents are approved.
 * No server-side consent field is collected in CP10.
 */
export const registrationConsentState = {
  status: "pending_legal_approval" as const,
  notice:
    "מסמכי פרטיות ותנאי שימוש מחייבים עדיין בעריכה. יצירת חשבון בשלב זה אינה מהווה הסכמה לתנאים שטרם פורסמו.",
  privacyPath: legalDocuments.privacy.path,
  termsPath: legalDocuments.terms.path,
};
