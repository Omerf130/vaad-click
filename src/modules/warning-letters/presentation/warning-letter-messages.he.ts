import { WarningLetterErrorCode } from "@/modules/warning-letters/domain/warning-letter-errors";

export function formatWarningLetterErrorHe(code: WarningLetterErrorCode): string {
  switch (code) {
    case WarningLetterErrorCode.CASE_NOT_APPROVED_FOR_LETTER_PREP:
      return "תצוגת מכתב ההתראה זמינה רק לאחר אישור התיק להכנת מכתב.";
    case WarningLetterErrorCode.MISSING_PUBLISHED_FINANCIAL_SETTINGS:
      return "לא נמצאו הגדרות כספיות מפורסמות לתאריך המכתב — לא ניתן להציג תצוגה מקדימה.";
    case WarningLetterErrorCode.INCOMPATIBLE_FINANCIAL_SETTINGS:
      return "גרסת ההגדרות הכספיות אינה תואמת למכתב התראה (נדרש מודל ברוטו כולל מע״מ).";
    case WarningLetterErrorCode.MISSING_TREATMENT_FEE_WHEN_ELIGIBLE:
      return "לבניין מסומן בסיס להוצאות טיפול, אך חסר סכום הוצאות טיפול בהגדרות המפורסמות.";
    case WarningLetterErrorCode.MISSING_DEBTOR_NAME:
      return "חסר שם חייב להצגת המכתב.";
    case WarningLetterErrorCode.MISSING_BUILDING_ADDRESS:
      return "חסרה כתובת בניין להצגת המכתב.";
    case WarningLetterErrorCode.MISSING_APARTMENT:
      return "חסר מספר דירה להצגת המכתב.";
    case WarningLetterErrorCode.MISSING_MANAGEMENT_COMPANY_NAME:
      return "חסר שם חברת ניהול לנוסח המכתב.";
    default:
      return "לא ניתן להציג תצוגה מקדימה של המכתב.";
  }
}
