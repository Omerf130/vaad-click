import { AuditEventType } from "@/shared/audit/domain/audit-event-taxonomy";

/** Debt-case audit events operators may see (sanitized presentation only). */
export const OPERATOR_VISIBLE_DEBT_CASE_AUDIT_EVENT_TYPES: readonly string[] = [
  AuditEventType.DEBT_CASE_DRAFT_CREATED,
  AuditEventType.DEBT_CASE_SUBMITTED,
  AuditEventType.DEBT_CASE_RETURNED,
  AuditEventType.DEBT_CASE_REJECTED,
  AuditEventType.DEBT_CASE_APPROVED_FOR_LETTER_PREP,
] as const;

export const OPERATOR_DEBT_CASE_ACTIVITY_DEFAULT_LIMIT = 25;
export const OPERATOR_PORTAL_RECENT_ACTIVITY_LIMIT = 15;

export function isOperatorVisibleDebtCaseAuditEventType(eventType: string): boolean {
  return (OPERATOR_VISIBLE_DEBT_CASE_AUDIT_EVENT_TYPES as readonly string[]).includes(eventType);
}
