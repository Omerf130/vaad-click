import { StatementOfClaimDraftErrorCode } from "@/modules/statement-of-claim-drafts/domain/statement-of-claim-draft-errors";

export function formatStatementOfClaimDraftErrorHe(
  code: StatementOfClaimDraftErrorCode,
): string {
  switch (code) {
    case StatementOfClaimDraftErrorCode.FORBIDDEN:
      return "אין הרשאה ליצור טיוטת כתב תביעה.";
    case StatementOfClaimDraftErrorCode.NOT_FOUND:
      return "טיוטה לא נמצאה.";
    case StatementOfClaimDraftErrorCode.MISSING_TEMPLATE:
      return "תבנית כתב תביעה לפיתוח אינה זמינה.";
    case StatementOfClaimDraftErrorCode.HARD_BLOCKERS:
      return "לא ניתן ליצור טיוטה — חסרים נתונים חיוניים.";
    case StatementOfClaimDraftErrorCode.NON_OPERATIVE_ENFORCED:
      return "טיוטה זו לפיתוח בלבד ואינה מבצעית.";
    case StatementOfClaimDraftErrorCode.CONCURRENCY_CONFLICT:
      return "הטיוטה עודכנה במקביל — טען מחדש ונסה שוב.";
    case StatementOfClaimDraftErrorCode.UNSAFE_SECTION_TEXT:
      return "טקסט המקטע אינו תקין או מכיל תווים אסורים.";
    case StatementOfClaimDraftErrorCode.EDIT_NOT_ALLOWED:
      return "לא ניתן לשמור את העריכה.";
    case StatementOfClaimDraftErrorCode.LAWYER_EDITS_REPLACE_REQUIRED:
      return "נדרש אישור להחלפת עריכות עורך דין לפני יצירה מחדש.";
    default:
      return "שגיאה בטיוטת כתב תביעה.";
  }
}