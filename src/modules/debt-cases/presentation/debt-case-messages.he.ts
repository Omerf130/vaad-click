import { DebtCaseErrorCode } from "@/modules/debt-cases/domain/debt-case-errors";

export function mapDebtCaseErrorToHebrew(code: DebtCaseErrorCode): string {
  switch (code) {
    case DebtCaseErrorCode.FORBIDDEN:
      return "אין הרשאה לפעולה זו.";
    case DebtCaseErrorCode.NOT_FOUND:
      return "תיק החוב לא נמצא.";
    case DebtCaseErrorCode.VALIDATION:
      return "הנתונים אינם תקינים או שיש חסימת בדיקה.";
    case DebtCaseErrorCode.INVALID_STATUS_TRANSITION:
      return "לא ניתן לשנות את סטטוס התיק במצב הנוכחי.";
    case DebtCaseErrorCode.INVALID_REVIEW_TRANSITION:
      return "לא ניתן לבצע פעולת בדיקה זו — התיק כבר לא ממתין לאישור עורך דין.";
    case DebtCaseErrorCode.SUBMIT_NOT_ALLOWED:
      return "לא ניתן להגיש תיק לבדיקה בחשבון זה.";
    case DebtCaseErrorCode.EDIT_NOT_ALLOWED:
      return "לא ניתן לערוך תיק במצב הנוכחי.";
    case DebtCaseErrorCode.DUPLICATE_OVERLAP:
      return "קיים חוב חופף לדירה ולתקופה — לא ניתן להגיש.";
    case DebtCaseErrorCode.REVISION_CONFLICT:
      return "התיק עודכן במקביל. רעננו את הדף ונסו שוב.";
    case DebtCaseErrorCode.AUDIT_PERSISTENCE:
      return "הפעולה לא הושלמה — רישום ביקורת נכשל.";
    case DebtCaseErrorCode.ONBOARDING_NOT_READY:
      return "ההרשמה טרם הושלמה — לא ניתן ליצור תיק.";
    default:
      return "לא ניתן להשלים את הפעולה.";
  }
}
