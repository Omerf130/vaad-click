export const StatementOfClaimDraftErrorCode = {
  NOT_FOUND: "not_found",
  FORBIDDEN: "forbidden",
  HARD_BLOCKERS: "hard_blockers",
  MISSING_TEMPLATE: "missing_template",
  NON_OPERATIVE_ENFORCED: "non_operative_enforced",
  CONCURRENCY_CONFLICT: "concurrency_conflict",
  UNSAFE_SECTION_TEXT: "unsafe_section_text",
  EDIT_NOT_ALLOWED: "edit_not_allowed",
  LAWYER_EDITS_REPLACE_REQUIRED: "lawyer_edits_replace_required",
} as const;

export type StatementOfClaimDraftErrorCode =
  (typeof StatementOfClaimDraftErrorCode)[keyof typeof StatementOfClaimDraftErrorCode];

export class StatementOfClaimDraftError extends Error {
  readonly code: StatementOfClaimDraftErrorCode;
  readonly blockersHe?: string[];

  constructor(
    code: StatementOfClaimDraftErrorCode,
    message: string,
    blockersHe?: string[],
  ) {
    super(message);
    this.name = "StatementOfClaimDraftError";
    this.code = code;
    this.blockersHe = blockersHe;
  }
}