export const WarningLetterReviewPdfDisposition = {
  INLINE: "inline",
  ATTACHMENT: "attachment",
} as const;

export type WarningLetterReviewPdfDisposition =
  (typeof WarningLetterReviewPdfDisposition)[keyof typeof WarningLetterReviewPdfDisposition];

export function buildWarningLetterReviewPdfPath(input: {
  debtCaseId: string;
  draftId: string;
  disposition?: WarningLetterReviewPdfDisposition;
}): string {
  const params = new URLSearchParams({ draftId: input.draftId });
  if (input.disposition === WarningLetterReviewPdfDisposition.ATTACHMENT) {
    params.set("disposition", "attachment");
  }
  return `/app/admin/debt-cases/${input.debtCaseId}/warning-letter/review-pdf?${params.toString()}`;
}

export function buildWarningLetterReviewPdfFilename(input: {
  letterCaseReference: string;
  draftRevision: number;
}): string {
  const safeRef = input.letterCaseReference.replace(/[^a-zA-Z0-9-]/g, "_");
  return `warning-letter-review-${safeRef}-rev${input.draftRevision}.pdf`;
}