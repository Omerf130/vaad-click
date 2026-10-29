import { BuildingLegalDocumentGenerationBlockCode } from "@/modules/building-legal-documents/domain/building-legal-document-generation-block";
import { BuildingLegalDocumentErrorCode } from "@/modules/building-legal-documents/domain/building-legal-document-errors";
import { BuildingLegalDocumentUiStatus } from "@/modules/building-legal-documents/domain/building-legal-document-status";

const ERROR_MESSAGES: Record<BuildingLegalDocumentErrorCode, string> = {
  [BuildingLegalDocumentErrorCode.FORBIDDEN]: "אין הרשאה להפקת מסמך.",
  [BuildingLegalDocumentErrorCode.BUILDING_NOT_FOUND]: "הבניין לא נמצא.",
  [BuildingLegalDocumentErrorCode.BUILDING_NOT_ACTIVE]: "לא ניתן להפיק מסמך לבניין שאינו פעיל.",
  [BuildingLegalDocumentErrorCode.TEMPLATE_NOT_PUBLISHED]: "אין תבנית שפורסמה לקטגוריה זו.",
  [BuildingLegalDocumentErrorCode.TEMPLATE_NOT_APPROVED]:
    "אין תבנית עם אישור משפטי תקף — הפקה חסומה.",
  [BuildingLegalDocumentErrorCode.TEMPLATE_REVISION_INVALID]: "גרסת התבנית אינה תקפה להפקה.",
  [BuildingLegalDocumentErrorCode.UNKNOWN_CATEGORY]: "קטגוריית מסמך לא מוכרת.",
  [BuildingLegalDocumentErrorCode.CONCURRENT_GENERATION]:
    "הופק מסמך במקביל — נסו שוב אם נדרש.",
  [BuildingLegalDocumentErrorCode.DOCUMENT_NOT_FOUND]: "המסמך לא נמצא.",
};

const BLOCK_MESSAGES: Record<BuildingLegalDocumentGenerationBlockCode, string> = {
  [BuildingLegalDocumentGenerationBlockCode.NO_APPROVED_PUBLISHED_TEMPLATE]:
    "הפקה אינה זמינה: אין תבנית שפורסמה ואושרה על ידי עורך דין לקטגוריה זו.",
  [BuildingLegalDocumentGenerationBlockCode.BUILDING_NOT_ACTIVE]:
    "הפקה אינה זמינה לבניין שאינו פעיל.",
  [BuildingLegalDocumentGenerationBlockCode.BUILDING_NOT_FOUND]:
    "הבניין לא נמצא.",
};

export function formatBuildingLegalDocumentErrorHe(
  code: BuildingLegalDocumentErrorCode,
): string {
  return ERROR_MESSAGES[code] ?? "לא ניתן להפיק את המסמך.";
}

export function formatBuildingLegalDocumentGenerationBlockHe(
  code: BuildingLegalDocumentGenerationBlockCode,
): string {
  return BLOCK_MESSAGES[code] ?? "הפקה אינה זמינה.";
}

export function buildingLegalDocumentUiStatusLabelHe(
  status: BuildingLegalDocumentUiStatus,
): string {
  switch (status) {
    case BuildingLegalDocumentUiStatus.NOT_GENERATED:
      return "לא הופק";
    case BuildingLegalDocumentUiStatus.GENERATED_PENDING_SIGNATURE:
      return "הופק — ממתין לחתימה";
    case BuildingLegalDocumentUiStatus.SUPERSEDED:
      return "הוחלף";
  }
}

export const PORTAL_SIGNATURE_UNAVAILABLE_HE = "חתימה דיגיטלית עדיין אינה זמינה.";

export const BUILDING_LEGAL_DOCUMENT_READONLY_BANNER_HE =
  "תצוגה לקריאה בלבד — תוכן זה הוא צילום מצב שהופק לבניין ואינו ניתן לעריכה.";

export const BUILDING_LEGAL_DOCUMENT_HISTORICAL_BANNER_HE =
  "מסמך היסטורי שהוחלף — לצפייה בלבד.";

export const BUILDING_LEGAL_DOCUMENT_PDF_VIEW_LABEL_HE = "צפייה ב-PDF";

export const BUILDING_LEGAL_DOCUMENT_PDF_DOWNLOAD_LABEL_HE = "הורדת PDF";

export const BUILDING_LEGAL_DOCUMENT_PDF_HINT_HE =
  "ה-PDF נוצר מהצילום השמור של המסמך. אם הדפדפן חוסם תצוגה, השתמשו בהורדה.";
