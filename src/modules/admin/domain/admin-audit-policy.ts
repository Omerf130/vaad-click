import { AuditEventType } from "@/shared/audit/domain/audit-event-taxonomy";

/** Events safe to show on lawyer-admin dashboard timeline (no raw metadata). */
export const ADMIN_DASHBOARD_ACTIVITY_EVENT_TYPES: readonly string[] = [
  AuditEventType.USER_ADMIN_ACCOUNT_APPROVED,
  AuditEventType.USER_ADMIN_ACCOUNT_REJECTED,
  AuditEventType.BUILDING_RECORD_CREATED,
  AuditEventType.BUILDING_RECORD_UPDATED,
  AuditEventType.BUILDING_MANAGEMENT_COMPANY_LINKED,
  AuditEventType.BUILDING_REPRESENTATIVE_ASSIGNED,
  AuditEventType.DEBT_CASE_SUBMITTED,
  AuditEventType.DEBT_CASE_RETURNED,
  AuditEventType.DEBT_CASE_REJECTED,
  AuditEventType.DEBT_CASE_APPROVED_FOR_LETTER_PREP,
  AuditEventType.LEGAL_DOCUMENT_WARNING_LETTER_DRAFT_CREATED,
  AuditEventType.LEGAL_DOCUMENT_WARNING_LETTER_WORDING_APPROVED,
] as const;

export const ADMIN_DASHBOARD_ACTIVITY_LIMIT = 15;

/** Debt-case timeline for lawyer review detail. */
export const ADMIN_DEBT_CASE_ACTIVITY_EVENT_TYPES: readonly string[] = [
  AuditEventType.DEBT_CASE_DRAFT_CREATED,
  AuditEventType.DEBT_CASE_DRAFT_UPDATED,
  AuditEventType.DEBT_CASE_SUBMITTED,
  AuditEventType.DEBT_CASE_RETURNED,
  AuditEventType.DEBT_CASE_REJECTED,
  AuditEventType.DEBT_CASE_APPROVED_FOR_LETTER_PREP,
  AuditEventType.DEBT_CASE_REVIEW_INVALIDATED_BY_EDIT,
  AuditEventType.LEGAL_DOCUMENT_WARNING_LETTER_DRAFT_CREATED,
  AuditEventType.LEGAL_DOCUMENT_WARNING_LETTER_DRAFT_EDITED,
  AuditEventType.LEGAL_DOCUMENT_WARNING_LETTER_WORDING_APPROVED,
  AuditEventType.LEGAL_DOCUMENT_WARNING_LETTER_WORDING_RETURNED,
] as const;

export const ADMIN_DEBT_CASE_ACTIVITY_LIMIT = 30;

export function isAdminDashboardActivityEventType(eventType: string): boolean {
  return (ADMIN_DASHBOARD_ACTIVITY_EVENT_TYPES as readonly string[]).includes(eventType);
}

export function isAdminDebtCaseActivityEventType(eventType: string): boolean {
  return (ADMIN_DEBT_CASE_ACTIVITY_EVENT_TYPES as readonly string[]).includes(eventType);
}
