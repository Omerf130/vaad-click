import "server-only";

import { LegalDocumentTemplateCategory } from "@/modules/legal-document-templates/domain/legal-document-template-category";
import { computeLegalDocumentTemplateContentSha256 } from "@/modules/legal-document-templates/domain/legal-document-template-content-hash";
import { LegalDocumentTemplateOperativeStatus } from "@/modules/legal-document-templates/domain/legal-document-template-operative-status";
import { LegalDocumentTemplateRevisionStatus } from "@/modules/legal-document-templates/domain/legal-document-template-revision-status";
import { LegalDocumentTemplate } from "@/modules/legal-document-templates/infra/legal-document-template.model";
import { LegalDocumentTemplateRevision } from "@/modules/legal-document-templates/infra/legal-document-template-revision.model";
import { StatementOfClaimDraftError, StatementOfClaimDraftErrorCode } from "@/modules/statement-of-claim-drafts/domain/statement-of-claim-draft-errors";
import { connectMongo } from "@/shared/db/connect";

export type DevelopmentStatementOfClaimTemplateRevision = {
  templateId: string;
  revisionId: string;
  revisionNumber: number;
  bodyText: string;
  contentSha256: string;
  operativeStatus: typeof LegalDocumentTemplateOperativeStatus.DEVELOPMENT_ONLY;
};

/**
 * Resolves the current development-only statement-of-claim template draft revision.
 * Operative published templates are intentionally excluded in CP23C.
 */
export async function resolveDevelopmentStatementOfClaimTemplateRevision(): Promise<DevelopmentStatementOfClaimTemplateRevision | null> {
  await connectMongo();
  const template = await LegalDocumentTemplate.findOne({
    category: LegalDocumentTemplateCategory.STATEMENT_OF_CLAIM,
  }).lean();
  if (!template) {
    return null;
  }

  const revision = await LegalDocumentTemplateRevision.findOne({
    templateId: template.templateId,
    category: LegalDocumentTemplateCategory.STATEMENT_OF_CLAIM,
    isCurrentDraft: true,
    operativeStatus: LegalDocumentTemplateOperativeStatus.DEVELOPMENT_ONLY,
    lifecycleStatus: LegalDocumentTemplateRevisionStatus.DRAFT,
  }).lean();

  if (!revision) {
    return null;
  }

  const expectedHash = computeLegalDocumentTemplateContentSha256({
    category: LegalDocumentTemplateCategory.STATEMENT_OF_CLAIM,
    revisionId: revision.revisionId,
    bodyText: revision.bodyText,
  });
  if (expectedHash !== revision.contentSha256) {
    return null;
  }

  return {
    templateId: template.templateId,
    revisionId: revision.revisionId,
    revisionNumber: revision.revisionNumber,
    bodyText: revision.bodyText,
    contentSha256: revision.contentSha256,
    operativeStatus: LegalDocumentTemplateOperativeStatus.DEVELOPMENT_ONLY,
  };
}

export async function requireDevelopmentStatementOfClaimTemplateRevision(): Promise<DevelopmentStatementOfClaimTemplateRevision> {
  const revision = await resolveDevelopmentStatementOfClaimTemplateRevision();
  if (!revision) {
    throw new StatementOfClaimDraftError(
      StatementOfClaimDraftErrorCode.MISSING_TEMPLATE,
      "Development statement of claim template is not available",
    );
  }
  return revision;
}