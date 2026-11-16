import { LegalDocumentTemplateErrorCode } from "@/modules/legal-document-templates/domain/legal-document-template-errors";
import { LegalDocumentTemplateOperativeStatus } from "@/modules/legal-document-templates/domain/legal-document-template-operative-status";
import {
  isPublishedLegalDocumentTemplateRevision,
  type LegalDocumentTemplateRevisionStatus,
} from "@/modules/legal-document-templates/domain/legal-document-template-revision-status";

export type RevisionPublishEligibilityInput = {
  category: string;
  operativeStatus: LegalDocumentTemplateOperativeStatus;
  lifecycleStatus: LegalDocumentTemplateRevisionStatus;
  isCurrentDraft: boolean;
  contentSha256: string;
  approvalContentSha256: string | null;
};

export type RevisionApprovalEligibilityInput = {
  category: string;
  operativeStatus: LegalDocumentTemplateOperativeStatus;
  lifecycleStatus: LegalDocumentTemplateRevisionStatus;
  isCurrentDraft: boolean;
};

export function assertRevisionBodyMutable(input: {
  lifecycleStatus: LegalDocumentTemplateRevisionStatus;
}): { ok: true } | { ok: false; code: typeof LegalDocumentTemplateErrorCode.REVISION_IMMUTABLE } {
  if (isPublishedLegalDocumentTemplateRevision(input.lifecycleStatus)) {
    return { ok: false, code: LegalDocumentTemplateErrorCode.REVISION_IMMUTABLE };
  }
  return { ok: true };
}

export function evaluateApprovalEligibility(
  input: RevisionApprovalEligibilityInput,
): { ok: true } | { ok: false; code: typeof LegalDocumentTemplateErrorCode[keyof typeof LegalDocumentTemplateErrorCode] } {
  if (isPublishedLegalDocumentTemplateRevision(input.lifecycleStatus)) {
    return { ok: false, code: LegalDocumentTemplateErrorCode.REVISION_IMMUTABLE };
  }
  if (!input.isCurrentDraft) {
    return { ok: false, code: LegalDocumentTemplateErrorCode.NOT_CURRENT_DRAFT };
  }
  if (input.operativeStatus === LegalDocumentTemplateOperativeStatus.DEVELOPMENT_ONLY) {
    return { ok: false, code: LegalDocumentTemplateErrorCode.NON_OPERATIVE_REVISION };
  }
  return { ok: true };
}

export function evaluatePublishEligibility(
  input: RevisionPublishEligibilityInput,
): { ok: true } | { ok: false; code: typeof LegalDocumentTemplateErrorCode[keyof typeof LegalDocumentTemplateErrorCode] } {
  if (input.operativeStatus === LegalDocumentTemplateOperativeStatus.DEVELOPMENT_ONLY) {
    return { ok: false, code: LegalDocumentTemplateErrorCode.NON_OPERATIVE_REVISION };
  }
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
