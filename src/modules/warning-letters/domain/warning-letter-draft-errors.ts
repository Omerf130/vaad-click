export const WarningLetterDraftErrorCode = {
  NOT_AUTHORIZED: "not_authorized",
  NOT_FOUND: "not_found",
  CASE_NOT_APPROVED_FOR_LETTER_PREP: "case_not_approved_for_letter_prep",
  DRAFT_NOT_INVALIDATED: "draft_not_invalidated",
  CONCURRENT_DRAFT_CONFLICT: "concurrent_draft_conflict",
  LEGACY_REFERENCE_UNIQUE_INDEX: "legacy_reference_unique_index",
  REGENERATION_NOT_ALLOWED: "regeneration_not_allowed",
  AUDIT_PERSISTENCE: "audit_persistence",
  STALE_DRAFT_REMAINS: "stale_draft_remains",
  EDIT_NOT_ALLOWED: "edit_not_allowed",
  DRAFT_LEGALLY_APPROVED: "draft_legally_approved",
  APPROVAL_BLOCKED: "approval_blocked",
  CONCURRENCY_CONFLICT: "concurrency_conflict",
  UNSAFE_CLAUSE_TEXT: "unsafe_clause_text",
  RETURN_REASON_REQUIRED: "return_reason_required",
} as const;

export type WarningLetterDraftErrorCode =
  (typeof WarningLetterDraftErrorCode)[keyof typeof WarningLetterDraftErrorCode];

export class WarningLetterDraftError extends Error {
  readonly code: WarningLetterDraftErrorCode;

  constructor(code: WarningLetterDraftErrorCode, message: string) {
    super(message);
    this.name = "WarningLetterDraftError";
    this.code = code;
  }
}
