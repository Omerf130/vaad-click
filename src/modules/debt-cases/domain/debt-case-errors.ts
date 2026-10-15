export const DebtCaseErrorCode = {
  FORBIDDEN: "DEBT_CASE_FORBIDDEN",
  NOT_FOUND: "DEBT_CASE_NOT_FOUND",
  VALIDATION: "DEBT_CASE_VALIDATION",
  INVALID_STATUS_TRANSITION: "DEBT_CASE_INVALID_STATUS_TRANSITION",
  INVALID_REVIEW_TRANSITION: "DEBT_CASE_INVALID_REVIEW_TRANSITION",
  SUBMIT_NOT_ALLOWED: "DEBT_CASE_SUBMIT_NOT_ALLOWED",
  EDIT_NOT_ALLOWED: "DEBT_CASE_EDIT_NOT_ALLOWED",
  DUPLICATE_OVERLAP: "DEBT_CASE_DUPLICATE_OVERLAP",
  REVISION_CONFLICT: "DEBT_CASE_REVISION_CONFLICT",
  AUDIT_PERSISTENCE: "DEBT_CASE_AUDIT_PERSISTENCE",
  ONBOARDING_NOT_READY: "DEBT_CASE_ONBOARDING_NOT_READY",
} as const;

export type DebtCaseErrorCode =
  (typeof DebtCaseErrorCode)[keyof typeof DebtCaseErrorCode];

export class DebtCaseError extends Error {
  readonly code: DebtCaseErrorCode;

  constructor(code: DebtCaseErrorCode, message: string) {
    super(message);
    this.name = "DebtCaseError";
    this.code = code;
  }
}
