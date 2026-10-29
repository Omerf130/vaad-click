export const LegalDocumentTemplateRevisionStatus = {
  DRAFT: "draft",
  DRAFT_SUPERSEDED: "draft_superseded",
  PUBLISHED: "published",
  SUPERSEDED: "superseded",
} as const;

export type LegalDocumentTemplateRevisionStatus =
  (typeof LegalDocumentTemplateRevisionStatus)[keyof typeof LegalDocumentTemplateRevisionStatus];

export function isPublishedLegalDocumentTemplateRevision(
  status: LegalDocumentTemplateRevisionStatus,
): boolean {
  return (
    status === LegalDocumentTemplateRevisionStatus.PUBLISHED ||
    status === LegalDocumentTemplateRevisionStatus.SUPERSEDED
  );
}
