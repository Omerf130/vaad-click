export const BuildingLegalDocumentPdfErrorCode = {
  INVALID_INPUT: "invalid_input",
  FONT_UNAVAILABLE: "font_unavailable",
  GENERATION_FAILED: "generation_failed",
} as const;

export type BuildingLegalDocumentPdfErrorCode =
  (typeof BuildingLegalDocumentPdfErrorCode)[keyof typeof BuildingLegalDocumentPdfErrorCode];

export class BuildingLegalDocumentPdfError extends Error {
  readonly code: BuildingLegalDocumentPdfErrorCode;

  constructor(code: BuildingLegalDocumentPdfErrorCode, message: string) {
    super(message);
    this.name = "BuildingLegalDocumentPdfError";
    this.code = code;
  }
}
