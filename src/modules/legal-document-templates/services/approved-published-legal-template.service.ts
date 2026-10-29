import "server-only";

import { computeLegalDocumentTemplateContentSha256 } from "@/modules/legal-document-templates/domain/legal-document-template-content-hash";
import type { LegalDocumentTemplateCategory } from "@/modules/legal-document-templates/domain/legal-document-template-category";
import { LegalDocumentTemplateRevisionStatus } from "@/modules/legal-document-templates/domain/legal-document-template-revision-status";
import { LegalDocumentTemplateApproval } from "@/modules/legal-document-templates/infra/legal-document-template-approval.model";
import { LegalDocumentTemplateRevision } from "@/modules/legal-document-templates/infra/legal-document-template-revision.model";
import { LegalDocumentTemplate } from "@/modules/legal-document-templates/infra/legal-document-template.model";
import { connectMongo } from "@/shared/db/connect";

export type ApprovedPublishedLegalTemplateRevision = {
  category: LegalDocumentTemplateCategory;
  templateId: string;
  revisionId: string;
  revisionNumber: number;
  contentSha256: string;
  bodyText: string;
  publishedAt: Date | null;
};

/**
 * Resolves the current published template revision only when it is published,
 * content hash is consistent, and an explicit approval exists for that hash.
 */
export async function resolveApprovedPublishedLegalTemplateRevision(
  category: LegalDocumentTemplateCategory,
): Promise<ApprovedPublishedLegalTemplateRevision | null> {
  await connectMongo();
  const template = await LegalDocumentTemplate.findOne({ category }).lean();
  if (!template?.latestPublishedRevisionId) {
    return null;
  }

  const revision = await LegalDocumentTemplateRevision.findOne({
    revisionId: template.latestPublishedRevisionId,
    category,
    lifecycleStatus: LegalDocumentTemplateRevisionStatus.PUBLISHED,
  }).lean();

  if (!revision) {
    return null;
  }

  const expectedHash = computeLegalDocumentTemplateContentSha256({
    category,
    revisionId: revision.revisionId,
    bodyText: revision.bodyText,
  });
  if (expectedHash !== revision.contentSha256) {
    return null;
  }

  const approval = await LegalDocumentTemplateApproval.findOne({
    revisionId: revision.revisionId,
    contentSha256: revision.contentSha256,
  }).lean();

  if (!approval) {
    return null;
  }

  return {
    category,
    templateId: template.templateId,
    revisionId: revision.revisionId,
    revisionNumber: revision.revisionNumber,
    contentSha256: revision.contentSha256,
    bodyText: revision.bodyText,
    publishedAt: revision.publishedAt ?? null,
  };
}
