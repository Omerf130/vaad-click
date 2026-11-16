export const LegalDocumentTemplateErrorCode = {
  FORBIDDEN: "forbidden",
  UNKNOWN_CATEGORY: "unknown_category",
  UNKNOWN_REVISION: "unknown_revision",
  NO_CURRENT_DRAFT: "no_current_draft",
  NOT_CURRENT_DRAFT: "not_current_draft",
  REVISION_IMMUTABLE: "revision_immutable",
  APPROVAL_REQUIRED: "approval_required",
  CONTENT_HASH_MISMATCH: "content_hash_mismatch",
  ALREADY_PUBLISHED: "already_published",
  DRAFT_ALREADY_EXISTS: "draft_already_exists",
  NON_OPERATIVE_REVISION: "non_operative_revision",
  STATEMENT_OF_CLAIM_BODY_INVALID: "statement_of_claim_body_invalid",
} as const;

export type LegalDocumentTemplateErrorCode =
  (typeof LegalDocumentTemplateErrorCode)[keyof typeof LegalDocumentTemplateErrorCode];

export class LegalDocumentTemplateError extends Error {
  readonly code: LegalDocumentTemplateErrorCode;

  constructor(code: LegalDocumentTemplateErrorCode, message: string) {
    super(message);
    this.name = "LegalDocumentTemplateError";
    this.code = code;
  }
}
