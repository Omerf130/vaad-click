import { INITIAL_WARNING_TEMPLATE_VERSION_ID } from "@/modules/warning-letters/domain/warning-letter-type";
import { WarningLetterDraftInvalidationReason } from "@/modules/warning-letters/domain/warning-letter-draft-invalidation-reason";
import { WarningLetterDraftLegalApprovalStatus } from "@/modules/warning-letters/domain/warning-letter-draft-legal-approval-status";
import { WarningLetterDraftLoadState } from "@/modules/warning-letters/domain/warning-letter-draft-load-state";
import { WarningLetterDraftStatus } from "@/modules/warning-letters/domain/warning-letter-draft-status";
import type { WarningLetterDraftErrorCode } from "@/modules/warning-letters/domain/warning-letter-draft-errors";

export function formatWarningLetterLegalApprovalStatusHe(
  status: WarningLetterDraftLegalApprovalStatus,
): string {
  switch (status) {
    case WarningLetterDraftLegalApprovalStatus.APPROVED:
      return "נוסח המכתב אושר (לא נשלח)";
    case WarningLetterDraftLegalApprovalStatus.RETURNED_FOR_CORRECTION:
      return "הוחזר לתיקון";
    default:
      return "טרם אושר";
  }
}

export function formatWarningLetterDraftLoadStateHe(
  loadState: WarningLetterDraftLoadState,
): string {
  switch (loadState) {
    case WarningLetterDraftLoadState.ACTIVE_CURRENT:
      return "טיוטה פעילה מעודכנת — ניתן לצפות בתוכן.";
    case WarningLetterDraftLoadState.ACTIVE_STALE:
      return "קיימת טיוטה פעילה, אך נתוני התיק השתנו — לא מוצגת כטיוטה נוכחית.";
    case WarningLetterDraftLoadState.NEEDS_REGENERATION:
      return "אין טיוטה פעילה — נדרשת יצירה מחדש לאחר ביטול הגרסה האחרונה.";
    case WarningLetterDraftLoadState.NO_DRAFT_YET:
      return "טרם נוצרה טיוטה שמורה לתיק זה — ניתן ליצור טיוטה או לאשר מחדש את התיק.";
    default:
      return "מצב טיוטה לא ידוע.";
  }
}

export function formatWarningLetterDraftStatusHe(
  status: WarningLetterDraftStatus,
  options?: { isCurrentForCase?: boolean },
): string {
  switch (status) {
    case WarningLetterDraftStatus.ACTIVE:
      if (options?.isCurrentForCase === false) {
        return "פעילה במערכת — לא מסונכרנת עם נתוני התיק הנוכחיים";
      }
      return "פעילה — מסונכרנת עם נתוני התיק";
    case WarningLetterDraftStatus.INVALIDATED:
      return "בוטלה — נדרשת יצירה מחדש";
    case WarningLetterDraftStatus.SUPERSEDED:
      return "הוחלפה בגרסה חדשה";
    default:
      return status;
  }
}

export function formatWarningLetterDraftInvalidationReasonHe(
  reason: WarningLetterDraftInvalidationReason | string | null,
): string | null {
  if (!reason) {
    return null;
  }
  switch (reason) {
    case WarningLetterDraftInvalidationReason.DEBT_CASE_MATERIAL_EDIT:
      return "שינוי מהותי בנתוני התיק";
    case WarningLetterDraftInvalidationReason.DEBT_CASE_REVIEW_INVALIDATED:
      return "ביטול אישור להכנת מכתב בעקבות עריכה";
    case WarningLetterDraftInvalidationReason.BUILDING_MATERIAL_CHANGE:
      return "שינוי מהותי בנתוני הבניין";
    case WarningLetterDraftInvalidationReason.FINANCIAL_SETTINGS_PUBLISHED:
      return "פורסמו הגדרות כספיות חדשות";
    default:
      return reason;
  }
}

export function formatWarningLetterDraftErrorHe(code: WarningLetterDraftErrorCode): string {
  switch (code) {
    case "not_authorized":
      return "אין הרשאה לטיוטת מכתב.";
    case "not_found":
      return "טיוטת מכתב לא נמצאה.";
    case "case_not_approved_for_letter_prep":
      return "התיק אינו מאושר להכנת מכתב.";
    case "draft_not_invalidated":
      return "אין טיוטה מבוטלת ליצירה מחדש.";
    case "regeneration_not_allowed":
      return "לא ניתן ליצור מחדש — קיימת טיוטה פעילה.";
    case "legacy_reference_unique_index":
      return "לא ניתן לשמור גרסת טיוטה חדשה — נדרש עדכון אינדקס במסד הנתונים (letterCaseReference). פנו למנהל המערכת לפי מסמך warning-letter-draft-index-migration.";
    case "concurrent_draft_conflict":
      return "יצירת הטיוטה נכשלה בגלל התנגשות מקבילה — נסו שוב.";
    case "stale_draft_remains":
      return "הטיוטה לא עודכנה — נתוני התיק עדיין אינם משוקפים במכתב. נסו שוב או פנו לתמיכה.";
    case "audit_persistence":
      return "הפעולה נכשלה — רישום ביקורת חובה.";
    case "edit_not_allowed":
      return "לא ניתן לערוך את הטיוטה במצב הנוכחי.";
    case "draft_legally_approved":
      return "טיוטה שאושרה אינה ניתנת לעריכה — השתמשו ב״החזרה לתיקון״.";
    case "approval_blocked":
      return "לא ניתן לאשר את הנוסח — יש לפתור את החסימות המפורטות.";
    case "concurrency_conflict":
      return "הטיוטה עודכנה במקביל — רעננו את העמוד ונסו שוב.";
    case "unsafe_clause_text":
      return "טקסט הסעיף אינו תקין (HTML או תווים אסורים).";
    case "return_reason_required":
      return "יש להזין סיבה להחזרה לתיקון.";
    default:
      return "לא ניתן לטפל בטיוטת המכתב.";
  }
}

export function formatWarningLetterTemplateVersionDisplayHe(templateVersionId: string): string {
  if (templateVersionId === INITIAL_WARNING_TEMPLATE_VERSION_ID) {
    return "מכתב התראה ראשון";
  }
  return "גרסת תבנית מותאמת";
}
