import { LegalDocumentTemplateErrorCode } from "@/modules/legal-document-templates/domain/legal-document-template-errors";

const MESSAGES: Record<LegalDocumentTemplateErrorCode, string> = {
  [LegalDocumentTemplateErrorCode.FORBIDDEN]: "אין הרשאה לפעולה זו.",
  [LegalDocumentTemplateErrorCode.UNKNOWN_CATEGORY]: "קטגוריית מסמך לא מוכרת.",
  [LegalDocumentTemplateErrorCode.UNKNOWN_REVISION]: "גרסת טיוטה לא נמצאה.",
  [LegalDocumentTemplateErrorCode.NO_CURRENT_DRAFT]: "אין טיוטה פעילה לקטגוריה זו.",
  [LegalDocumentTemplateErrorCode.NOT_CURRENT_DRAFT]: "ניתן לאשר או לפרסם רק את הטיוטה הפעילה.",
  [LegalDocumentTemplateErrorCode.REVISION_IMMUTABLE]: "גרסה שפורסמה אינה ניתנת לעריכה.",
  [LegalDocumentTemplateErrorCode.APPROVAL_REQUIRED]: "פרסום דורש אישור עורך דין לניסוח המדויק.",
  [LegalDocumentTemplateErrorCode.CONTENT_HASH_MISMATCH]:
    "הניסוח השתנה מאז האישור — נדרש אישור מחדש.",
  [LegalDocumentTemplateErrorCode.ALREADY_PUBLISHED]: "גרסה זו כבר פורסמה.",
  [LegalDocumentTemplateErrorCode.DRAFT_ALREADY_EXISTS]: "כבר קיימת טיוטה פעילה — שמרו שינוי או מחקו לפני יצירה חדשה.",
};

export function formatLegalDocumentTemplateErrorHe(
  code: LegalDocumentTemplateErrorCode,
): string {
  return MESSAGES[code] ?? "לא ניתן להשלים את הפעולה.";
}
