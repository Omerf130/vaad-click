/**
 * Audit event naming: `<category>.<domain>.<action>` (lowercase, dot-separated).
 * Definitions only in CP4A — emission wired in CP4B+ when workflows exist.
 */

export const AuditEventCategory = {
  AUTH: "auth",
  USER_ADMIN: "user_admin",
  BUILDING: "building",
  DEBT_CASE: "debt_case",
  LAWYER_APPROVAL: "lawyer_approval",
  LEGAL_DOCUMENT: "legal_document",
  DEBTOR_ACCESS: "debtor_access",
  PAYMENT: "payment",
  SYSTEM_CONFIG: "system_config",
} as const;

export type AuditEventCategory =
  (typeof AuditEventCategory)[keyof typeof AuditEventCategory];

/** Illustrative event types per category (not emitted until corresponding CP). */
export const AuditEventType = {
  AUTH_LOGIN_SUCCESS: "auth.login.success",
  AUTH_LOGIN_FAILURE: "auth.login.failure",
  AUTH_LOGOUT: "auth.logout",
  AUTH_SESSION_REVOKED: "auth.session.revoked",
  AUTH_REGISTRATION_SUCCESS: "auth.registration.success",
  AUTH_REGISTRATION_FAILURE: "auth.registration.failure",
  AUTH_RATE_LIMIT_EXCEEDED: "auth.rate_limit.exceeded",
  AUTH_ACCESS_FORBIDDEN: "auth.access.forbidden",
  AUTH_ACCOUNT_PASSWORD_INITIALIZED: "auth.account.password_initialized",
  USER_ADMIN_CREATED: "user_admin.account.created",
  USER_ADMIN_STATUS_CHANGED: "user_admin.account.status_changed",
  BUILDING_REGISTERED: "building.registration.submitted",
  BUILDING_VERIFIED: "building.verification.completed",
  DEBT_CASE_CREATED: "debt_case.case.created",
  DEBT_CASE_STATUS_CHANGED: "debt_case.case.status_changed",
  LAWYER_APPROVAL_GRANTED: "lawyer_approval.letter.approved",
  LAWYER_APPROVAL_DENIED: "lawyer_approval.letter.denied",
  LEGAL_DOCUMENT_GENERATED: "legal_document.letter.generated",
  LEGAL_DOCUMENT_DELIVERED: "legal_document.letter.delivered",
  DEBTOR_ACCESS_LINK_ISSUED: "debtor_access.link.issued",
  DEBTOR_DISPUTE_FILED: "debtor_access.dispute.filed",
  PAYMENT_RECORDED: "payment.transaction.recorded",
  PAYMENT_ADJUSTED: "payment.ledger.adjusted",
  SYSTEM_CONFIG_UPDATED: "system_config.settings.updated",
} as const;

export type AuditEventType = (typeof AuditEventType)[keyof typeof AuditEventType];

export const AUDIT_EVENT_TYPE_VALUES: readonly AuditEventType[] =
  Object.values(AuditEventType);

const EVENT_TYPE_PATTERN = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/;

export function isWellFormedAuditEventType(value: string): boolean {
  return value.length <= 120 && EVENT_TYPE_PATTERN.test(value);
}
