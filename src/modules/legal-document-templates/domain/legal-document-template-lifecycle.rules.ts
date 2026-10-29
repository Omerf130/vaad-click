import { LegalDocumentTemplateErrorCode } from "@/modules/legal-document-templates/domain/legal-document-template-errors";
import {
  isPublishedLegalDocumentTemplateRevision,
  type LegalDocumentTemplateRevisionStatus,
} from "@/modules/legal-document-templates/domain/legal-document-template-revision-status";

export type RevisionPublishEligibilityInput = {
  lifecycleStatus: LegalDocumentTemplateRevisionStatus;
  isCurrentDraft: boolean;
  contentSha256: string;
  approvalContentSha256: string | null;
};

export function assertRevisionBodyMutable(input: {
  lifecycleStatus: LegalDocumentTemplateRevisionStatus;
}): { ok: true } | { ok: false; code: typeof LegalDocumentTemplateErrorCode.REVISION_IMMUTABLE } {
  if (isPublishedLegalDocumentTemplateRevision(input.lifecycleStatus)) {
    return { ok: false, code: LegalDocumentTemplateErrorCode.REVISION_IMMUTABLE };
  }
  return { ok: true };
}

export function evaluatePublishEligibility(
  input: RevisionPublishEligibilityInput,
): { ok: true } | { ok: false; code: typeof LegalDocumentTemplateErrorCode[keyof typeof LegalDocumentTemplateErrorCode] } {
  if (isPublishedLegalDocumentTemplateRevision(input.lifecycleStatus)) {
    return { ok: false, code: LegalDocumentTemplateErrorCode.ALREADY_PUBLISHED };
  }
  if (!input.isCurrentDraft) {
    return { ok: false, code: LegalDocumentTemplateErrorCode.NOT_CURRENT_DRAFT };
  }
  if (input.approvalContentSha256 == null) {
    return { ok: false, code: LegalDocumentTemplateErrorCode.APPROVAL_REQUIRED };
  }
  if (input.approvalContentSha256 !== input.contentSha256) {
    return { ok: false, code: LegalDocumentTemplateErrorCode.CONTENT_HASH_MISMATCH };
  }
  return { ok: true };
}
