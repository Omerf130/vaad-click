export const WarningLetterPdfErrorCode = {
  VALIDATION: "validation",
  FORBIDDEN: "forbidden",
  NOT_FOUND: "not_found",
  GENERATION_FAILED: "generation_failed",
  FONT_UNAVAILABLE: "font_unavailable",
  CHROMIUM_UNAVAILABLE: "chromium_unavailable",
} as const;

export type WarningLetterPdfErrorCode =
  (typeof WarningLetterPdfErrorCode)[keyof typeof WarningLetterPdfErrorCode];

export class WarningLetterPdfError extends Error {
  readonly code: WarningLetterPdfErrorCode;

  constructor(code: WarningLetterPdfErrorCode, message: string) {
    super(message);
    this.name = "WarningLetterPdfError";
    this.code = code;
  }
}