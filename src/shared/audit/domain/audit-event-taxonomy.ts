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
  USER_ADMIN_ACCOUNT_APPROVED: "user_admin.account.approved",
  USER_ADMIN_ACCOUNT_REJECTED: "user_admin.account.rejected",
  USER_ADMIN_ACCOUNT_RECONSIDERED: "user_admin.account.reconsidered",
  BUILDING_RECORD_CREATED: "building.record.created",
  BUILDING_RECORD_UPDATED: "building.record.updated",
  BUILDING_RECORD_ARCHIVED: "building.record.archived",
  BUILDING_REPRESENTATIVE_ASSIGNED: "building.representative.assigned",
  BUILDING_REPRESENTATIVE_REPLACED: "building.representative.replaced",
  BUILDING_REPRESENTATIVE_REMOVED: "building.representative.removed",
  BUILDING_MANAGEMENT_COMPANY_LINKED: "building.management_company.linked",
  BUILDING_MANAGEMENT_COMPANY_UNLINKED: "building.management_company.unlinked",
  BUILDING_DUPLICATE_ADDRESS_EXCEPTION: "building.record.duplicate_exception_created",
  BUILDING_COMMITTEE_ENGAGEMENT_PROPOSED_TERMS_CAPTURED:
    "building.committee_engagement.proposed_terms_captured",
  BUILDING_COMMITTEE_ENGAGEMENT_PROPOSED_TERMS_REPLACED:
    "building.committee_engagement.proposed_terms_replaced",
  BUILDING_VERIFICATION_STATUS_CHANGED: "building.verification_status.changed",
  MANAGEMENT_COMPANY_RECORD_CREATED: "management_company.record.created",
  MANAGEMENT_COMPANY_RECORD_UPDATED: "management_company.record.updated",
  MANAGEMENT_COMPANY_RECORD_ARCHIVED: "management_company.record.archived",
  MANAGEMENT_COMPANY_PRIMARY_USER_LINKED: "management_company.primary_user.linked",
  BUILDING_REGISTERED: "building.registration.submitted",
  BUILDING_VERIFIED: "building.verification.completed",
  DEBT_CASE_CREATED: "debt_case.case.created",
  DEBT_CASE_DRAFT_CREATED: "debt_case.draft.created",
  DEBT_CASE_DRAFT_UPDATED: "debt_case.draft.updated",
  DEBT_CASE_SUBMITTED: "debt_case.case.submitted",
  DEBT_CASE_RETURNED: "debt_case.case.returned",
  DEBT_CASE_REJECTED: "debt_case.case.rejected",
  DEBT_CASE_APPROVED_FOR_LETTER_PREP: "debt_case.case.approved_for_letter_prep",
  DEBT_CASE_REVIEW_INVALIDATED_BY_EDIT: "debt_case.review.invalidated_by_edit",
  DEBT_CASE_STATUS_CHANGED: "debt_case.case.status_changed",
  LAWYER_APPROVAL_GRANTED: "lawyer_approval.letter.approved",
  LAWYER_APPROVAL_DENIED: "lawyer_approval.letter.denied",
  LEGAL_DOCUMENT_GENERATED: "legal_document.letter.generated",
  LEGAL_DOCUMENT_WARNING_LETTER_DRAFT_CREATED: "legal_document.warning_letter_draft.created",
  LEGAL_DOCUMENT_WARNING_LETTER_DRAFT_INVALIDATED:
    "legal_document.warning_letter_draft.invalidated",
  LEGAL_DOCUMENT_WARNING_LETTER_DRAFT_REGENERATED:
    "legal_document.warning_letter_draft.regenerated",
  LEGAL_DOCUMENT_WARNING_LETTER_DRAFT_EDITED: "legal_document.warning_letter_draft.edited",
  LEGAL_DOCUMENT_WARNING_LETTER_WORDING_APPROVED:
    "legal_document.warning_letter_draft.wording_approved",
  LEGAL_DOCUMENT_WARNING_LETTER_WORDING_RETURNED:
    "legal_document.warning_letter_draft.wording_returned",
  LEGAL_DOCUMENT_WARNING_LETTER_TEMPLATE_VARIANT_APPROVED:
    "legal_document.warning_letter_template_variant.approved",
  LEGAL_DOCUMENT_WARNING_LETTER_FINALIZED:
    "legal_document.warning_letter.finalized",
  LEGAL_DOCUMENT_WARNING_LETTER_FINALIZATION_BLOCKED:
    "legal_document.warning_letter.finalization_blocked",
  LEGAL_DOCUMENT_WARNING_LETTER_DELIVERY_RECORDED:
    "legal_document.warning_letter.delivery_recorded",
  LEGAL_DOCUMENT_DELIVERED: "legal_document.letter.delivered",
  LEGAL_DOCUMENT_ASSET_UPLOAD_INITIATED: "legal_document.asset.upload_initiated",
  LEGAL_DOCUMENT_ASSET_UPLOAD_COMPLETED: "legal_document.asset.upload_completed",
  LEGAL_DOCUMENT_ASSET_UPLOAD_REJECTED: "legal_document.asset.upload_rejected",
  LEGAL_DOCUMENT_ASSET_DOWNLOADED: "legal_document.asset.downloaded",
  LEGAL_DOCUMENT_ASSET_SOFT_DELETED: "legal_document.asset.soft_deleted",
  LEGAL_DOCUMENT_ASSET_QUARANTINED: "legal_document.asset.quarantined",
  DEBTOR_ACCESS_LINK_ISSUED: "debtor_access.link.issued",
  DEBTOR_DISPUTE_FILED: "debtor_access.dispute.filed",
  PAYMENT_RECORDED: "payment.transaction.recorded",
  PAYMENT_ADJUSTED: "payment.ledger.adjusted",
  SYSTEM_CONFIG_UPDATED: "system_config.settings.updated",
  SYSTEM_CONFIG_FINANCIAL_SETTINGS_DRAFT_CREATED:
    "system_config.financial_settings.draft_created",
  SYSTEM_CONFIG_FINANCIAL_SETTINGS_DRAFT_UPDATED:
    "system_config.financial_settings.draft_updated",
  SYSTEM_CONFIG_FINANCIAL_SETTINGS_DRAFT_DISCARDED:
    "system_config.financial_settings.draft_discarded",
  SYSTEM_CONFIG_FINANCIAL_SETTINGS_VERSION_PUBLISHED:
    "system_config.financial_settings.version_published",
} as const;

export type AuditEventType = (typeof AuditEventType)[keyof typeof AuditEventType];

export const AUDIT_EVENT_TYPE_VALUES: readonly AuditEventType[] =
  Object.values(AuditEventType);

const EVENT_TYPE_PATTERN = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/;

export function isWellFormedAuditEventType(value: string): boolean {
  return value.length <= 120 && EVENT_TYPE_PATTERN.test(value);
}
