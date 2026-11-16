export const StatementOfClaimReviewPdfDisposition = {
  INLINE: "inline",
  ATTACHMENT: "attachment",
} as const;

export type StatementOfClaimReviewPdfDisposition =
  (typeof StatementOfClaimReviewPdfDisposition)[keyof typeof StatementOfClaimReviewPdfDisposition];

export function buildStatementOfClaimReviewPdfUrl(input: {
  debtCaseId: string;
  draftId: string;
  disposition?: StatementOfClaimReviewPdfDisposition;
}): string {
  const params = new URLSearchParams({ draftId: input.draftId });
  if (input.disposition === StatementOfClaimReviewPdfDisposition.ATTACHMENT) {
    params.set("disposition", StatementOfClaimReviewPdfDisposition.ATTACHMENT);
  }
  return `/app/admin/debt-cases/${input.debtCaseId}/statement-of-claim/review-pdf?${params.toString()}`;
}

export function buildStatementOfClaimReviewPdfFilename(input: {
  letterCaseReference: string;
  draftRevision: number;
}): string {
  const safeRef = input.letterCaseReference.replace(/[^\w.-]+/g, "_").slice(0, 48);
  return `statement-of-claim-review-${safeRef}-rev${input.draftRevision}.pdf`;
}