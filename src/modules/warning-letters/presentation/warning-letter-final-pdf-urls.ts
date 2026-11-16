export const WarningLetterFinalPdfDisposition = {
  INLINE: "inline",
  ATTACHMENT: "attachment",
} as const;

export type WarningLetterFinalPdfDisposition =
  (typeof WarningLetterFinalPdfDisposition)[keyof typeof WarningLetterFinalPdfDisposition];

export function buildWarningLetterFinalPdfPath(input: {
  debtCaseId: string;
  finalDocumentId: string;
  disposition?: WarningLetterFinalPdfDisposition;
}): string {
  const params = new URLSearchParams({ finalDocumentId: input.finalDocumentId });
  if (input.disposition === WarningLetterFinalPdfDisposition.ATTACHMENT) {
    params.set("disposition", WarningLetterFinalPdfDisposition.ATTACHMENT);
  }
  return `/app/admin/debt-cases/${input.debtCaseId}/warning-letter/final-pdf?${params.toString()}`;
}

export function buildWarningLetterFinalPdfFilename(input: {
  letterCaseReference: string;
  draftRevision: number;
}): string {
  const ref = input.letterCaseReference.replace(/[^\w\u0590-\u05FF.-]+/gu, "_");
  return `warning-letter-final_${ref}_v${input.draftRevision}.pdf`;
}