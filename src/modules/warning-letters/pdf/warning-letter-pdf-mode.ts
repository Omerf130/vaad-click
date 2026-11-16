export const WarningLetterPdfRenderMode = {
  REVIEW: "review",
  FINAL: "final",
} as const;

export type WarningLetterPdfRenderMode =
  (typeof WarningLetterPdfRenderMode)[keyof typeof WarningLetterPdfRenderMode];