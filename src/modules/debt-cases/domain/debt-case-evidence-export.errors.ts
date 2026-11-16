export const DebtCaseEvidenceExportErrorCode = {
  FORBIDDEN: "forbidden",
  NOT_FOUND: "not_found",
  VALIDATION: "validation",
  CROSS_CASE: "cross_case",
  MISSING_FILE: "missing_file",
  SIZE_LIMIT: "size_limit",
  DUPLICATE_SELECTION: "duplicate_selection",
} as const;

export type DebtCaseEvidenceExportErrorCode =
  (typeof DebtCaseEvidenceExportErrorCode)[keyof typeof DebtCaseEvidenceExportErrorCode];

export class DebtCaseEvidenceExportError extends Error {
  readonly code: DebtCaseEvidenceExportErrorCode;
  readonly messageHe?: string;

  constructor(
    code: DebtCaseEvidenceExportErrorCode,
    message: string,
    messageHe?: string,
  ) {
    super(message);
    this.name = "DebtCaseEvidenceExportError";
    this.code = code;
    this.messageHe = messageHe;
  }
}