import { AuditEventType } from "@/shared/audit/domain/audit-event-taxonomy";

export function formatOperatorDebtCaseActivityTitleHe(eventType: string): string {
  switch (eventType) {
    case AuditEventType.DEBT_CASE_DRAFT_CREATED:
      return "נוצרה טיוטת תיק";
    case AuditEventType.DEBT_CASE_DRAFT_UPDATED:
      return "טיוטת התיק עודכנה";
    case AuditEventType.DEBT_CASE_SUBMITTED:
      return "התיק הוגש לבדיקת עורך דין";
    case AuditEventType.DEBT_CASE_RETURNED:
      return "התיק הוחזר להשלמת פרטים";
    case AuditEventType.DEBT_CASE_REJECTED:
      return "התיק נדחה";
    case AuditEventType.DEBT_CASE_APPROVED_FOR_LETTER_PREP:
      return "התיק אושר להכנת מכתב (פנימי — לא נשלח מכתב)";
    default:
      return "עדכון בתיק";
  }
}

export const OPERATOR_REJECTION_GENERIC_MESSAGE_HE =
  "התיק נדחה על ידי עורך הדין. לפרטים נוספים פנו למשרד.";

export const OPERATOR_LETTER_PREP_CLARIFICATION_HE =
  "אישור להכנת מכתב הוא שלב פנימי במשרד — זה אינו אישור משלוח מכתב לחייב.";

export const OPERATOR_PAYMENT_NOT_ACTIVE_HE = "גביית תשלום מקוונת — לא פעילה במערכת.";

export const OPERATOR_LETTER_DELIVERY_NOT_ACTIVE_HE =
  "מעקב משלוח מכתב — לא פעיל עד להפעלה תפעולית עתידית.";
