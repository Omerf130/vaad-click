import { AuditEventType } from "@/shared/audit/domain/audit-event-taxonomy";

export function formatAdminActivityTitleHe(eventType: string): string {
  switch (eventType) {
    case AuditEventType.USER_ADMIN_ACCOUNT_APPROVED:
      return "חשבון משתמש אושר";
    case AuditEventType.USER_ADMIN_ACCOUNT_REJECTED:
      return "חשבון משתמש נדחה";
    case AuditEventType.BUILDING_RECORD_CREATED:
      return "נוצר רישום בניין";
    case AuditEventType.BUILDING_RECORD_UPDATED:
      return "עודכנו פרטי בניין";
    case AuditEventType.BUILDING_MANAGEMENT_COMPANY_LINKED:
      return "חברת ניהול שויכה לבניין";
    case AuditEventType.BUILDING_REPRESENTATIVE_ASSIGNED:
      return "נציג שויך לבניין";
    case AuditEventType.DEBT_CASE_SUBMITTED:
      return "תיק חוב הוגש לבדיקה";
    case AuditEventType.DEBT_CASE_RETURNED:
      return "תיק הוחזר להשלמה";
    case AuditEventType.DEBT_CASE_REJECTED:
      return "תיק חוב נדחה";
    case AuditEventType.DEBT_CASE_APPROVED_FOR_LETTER_PREP:
      return "תיק אושר להכנת מכתב";
    case AuditEventType.DEBT_CASE_DRAFT_CREATED:
      return "נוצרה טיוטת תיק";
    case AuditEventType.DEBT_CASE_DRAFT_UPDATED:
      return "טיוטת תיק עודכנה";
    case AuditEventType.DEBT_CASE_REVIEW_INVALIDATED_BY_EDIT:
      return "בדיקה בוטלה בעקבות עריכה";
    case AuditEventType.LEGAL_DOCUMENT_WARNING_LETTER_DRAFT_CREATED:
      return "נוצרה טיוטת מכתב אזהרה";
    case AuditEventType.LEGAL_DOCUMENT_WARNING_LETTER_DRAFT_EDITED:
      return "טיוטת מכתב נערכה";
    case AuditEventType.LEGAL_DOCUMENT_WARNING_LETTER_WORDING_APPROVED:
      return "נוסח מכתב אושר";
    case AuditEventType.LEGAL_DOCUMENT_WARNING_LETTER_WORDING_RETURNED:
      return "נוסח מכתב הוחזר לתיקון";
    default:
      return "עדכון במערכת";
  }
}

export function sanitizeAdminActivityDetailHe(eventType: string, metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object") {
    return null;
  }
  const row = metadata as Record<string, unknown>;
  if (
    eventType === AuditEventType.DEBT_CASE_RETURNED ||
    eventType === AuditEventType.DEBT_CASE_REJECTED ||
    eventType === AuditEventType.LEGAL_DOCUMENT_WARNING_LETTER_WORDING_RETURNED
  ) {
    const comment = typeof row.reviewCommentHe === "string" ? row.reviewCommentHe.trim() : "";
    if (comment.length >= 3 && comment.length <= 500) {
      return comment;
    }
  }
  return null;
}
