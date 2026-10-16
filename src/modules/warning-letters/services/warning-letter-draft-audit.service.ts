import "server-only";

import type { ClientSession } from "mongoose";

import { writeAuditEventMandatory } from "@/modules/audit/services/audit-writer.service";
import type { WarningLetterDraftInvalidationReason } from "@/modules/warning-letters/domain/warning-letter-draft-invalidation-reason";
import type { WarningLetterType } from "@/modules/warning-letters/domain/warning-letter-type";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import { buildUserAuditActor } from "@/shared/audit/build-audit-actor";
import { AuditEventType } from "@/shared/audit/domain/audit-event-taxonomy";
import { AuditOutcome } from "@/shared/audit/domain/audit-outcome";

type DraftAuditBase = {
  context: AuthenticatedContext;
  draftId: string;
  debtCaseId: string;
  buildingId: string;
  letterType: WarningLetterType;
  draftRevision: number;
  letterCaseReference: string;
  templateVersionId: string;
  contentSha256: string;
  approvalReady: boolean;
  correlationId?: string;
  session: ClientSession;
};

function safeDraftMetadata(input: {
  buildingId: string;
  letterType: WarningLetterType;
  draftRevision: number;
  letterCaseReference: string;
  templateVersionId: string;
  contentSha256Prefix: string;
  approvalReady: boolean;
  invalidationReason?: WarningLetterDraftInvalidationReason;
  priorDraftId?: string;
}) {
  return {
    buildingId: input.buildingId,
    letterType: input.letterType,
    draftRevision: input.draftRevision,
    letterCaseReference: input.letterCaseReference,
    templateVersionId: input.templateVersionId,
    contentSha256Prefix: input.contentSha256Prefix,
    approvalReady: input.approvalReady,
    ...(input.invalidationReason ? { invalidationReason: input.invalidationReason } : {}),
    ...(input.priorDraftId ? { priorDraftId: input.priorDraftId } : {}),
  };
}

export async function recordWarningLetterDraftCreated(input: DraftAuditBase): Promise<void> {
  await writeAuditEventMandatory(
    {
      eventType: AuditEventType.LEGAL_DOCUMENT_WARNING_LETTER_DRAFT_CREATED,
      actor: buildUserAuditActor(input.context),
      action: "warning_letter_draft_create",
      outcome: AuditOutcome.SUCCESS,
      target: { entityType: "warning_letter_draft", entityId: input.draftId },
      metadata: safeDraftMetadata({
        buildingId: input.buildingId,
        letterType: input.letterType,
        draftRevision: input.draftRevision,
        letterCaseReference: input.letterCaseReference,
        templateVersionId: input.templateVersionId,
        contentSha256Prefix: input.contentSha256.slice(0, 16),
        approvalReady: input.approvalReady,
      }),
      correlationId: input.correlationId,
    },
    { session: input.session },
  );
}

export async function recordWarningLetterDraftInvalidated(
  input: DraftAuditBase & {
    invalidationReason: WarningLetterDraftInvalidationReason;
  },
): Promise<void> {
  await writeAuditEventMandatory(
    {
      eventType: AuditEventType.LEGAL_DOCUMENT_WARNING_LETTER_DRAFT_INVALIDATED,
      actor: buildUserAuditActor(input.context),
      action: "warning_letter_draft_invalidate",
      outcome: AuditOutcome.SUCCESS,
      target: { entityType: "warning_letter_draft", entityId: input.draftId },
      metadata: safeDraftMetadata({
        buildingId: input.buildingId,
        letterType: input.letterType,
        draftRevision: input.draftRevision,
        letterCaseReference: input.letterCaseReference,
        templateVersionId: input.templateVersionId,
        contentSha256Prefix: input.contentSha256.slice(0, 16),
        approvalReady: input.approvalReady,
        invalidationReason: input.invalidationReason,
      }),
      correlationId: input.correlationId,
    },
    { session: input.session },
  );
}

export async function recordWarningLetterDraftEdited(
  input: DraftAuditBase & {
    priorDraftId: string;
    editedClauseIds: string[];
    manuallyEdited: boolean;
  },
): Promise<void> {
  await writeAuditEventMandatory(
    {
      eventType: AuditEventType.LEGAL_DOCUMENT_WARNING_LETTER_DRAFT_EDITED,
      actor: buildUserAuditActor(input.context),
      action: "warning_letter_draft_edit",
      outcome: AuditOutcome.SUCCESS,
      target: { entityType: "warning_letter_draft", entityId: input.draftId },
      metadata: {
        ...safeDraftMetadata({
          buildingId: input.buildingId,
          letterType: input.letterType,
          draftRevision: input.draftRevision,
          letterCaseReference: input.letterCaseReference,
          templateVersionId: input.templateVersionId,
          contentSha256Prefix: input.contentSha256.slice(0, 16),
          approvalReady: input.approvalReady,
          priorDraftId: input.priorDraftId,
        }),
        editedClauseIds: input.editedClauseIds.join(","),
        manuallyEdited: input.manuallyEdited,
      },
      correlationId: input.correlationId,
    },
    { session: input.session },
  );
}

export async function recordWarningLetterDraftWordingApproved(
  input: DraftAuditBase & { manualOverrideAcknowledged: boolean; manuallyEdited: boolean },
): Promise<void> {
  await writeAuditEventMandatory(
    {
      eventType: AuditEventType.LEGAL_DOCUMENT_WARNING_LETTER_WORDING_APPROVED,
      actor: buildUserAuditActor(input.context),
      action: "warning_letter_draft_wording_approve",
      outcome: AuditOutcome.SUCCESS,
      target: { entityType: "warning_letter_draft", entityId: input.draftId },
      metadata: {
        ...safeDraftMetadata({
          buildingId: input.buildingId,
          letterType: input.letterType,
          draftRevision: input.draftRevision,
          letterCaseReference: input.letterCaseReference,
          templateVersionId: input.templateVersionId,
          contentSha256Prefix: input.contentSha256.slice(0, 16),
          approvalReady: input.approvalReady,
        }),
        manualOverrideAcknowledged: input.manualOverrideAcknowledged,
        manuallyEdited: input.manuallyEdited,
      },
      correlationId: input.correlationId,
    },
    { session: input.session },
  );
}

export async function recordWarningLetterDraftWordingReturned(
  input: DraftAuditBase & { returnReason: string },
): Promise<void> {
  await writeAuditEventMandatory(
    {
      eventType: AuditEventType.LEGAL_DOCUMENT_WARNING_LETTER_WORDING_RETURNED,
      actor: buildUserAuditActor(input.context),
      action: "warning_letter_draft_wording_return",
      outcome: AuditOutcome.SUCCESS,
      target: { entityType: "warning_letter_draft", entityId: input.draftId },
      metadata: {
        ...safeDraftMetadata({
          buildingId: input.buildingId,
          letterType: input.letterType,
          draftRevision: input.draftRevision,
          letterCaseReference: input.letterCaseReference,
          templateVersionId: input.templateVersionId,
          contentSha256Prefix: input.contentSha256.slice(0, 16),
          approvalReady: input.approvalReady,
        }),
        returnReasonLength: input.returnReason.trim().length,
      },
      correlationId: input.correlationId,
    },
    { session: input.session },
  );
}

export async function recordWarningLetterDraftRegenerated(
  input: DraftAuditBase & { priorDraftId: string },
): Promise<void> {
  await writeAuditEventMandatory(
    {
      eventType: AuditEventType.LEGAL_DOCUMENT_WARNING_LETTER_DRAFT_REGENERATED,
      actor: buildUserAuditActor(input.context),
      action: "warning_letter_draft_regenerate",
      outcome: AuditOutcome.SUCCESS,
      target: { entityType: "warning_letter_draft", entityId: input.draftId },
      metadata: safeDraftMetadata({
        buildingId: input.buildingId,
        letterType: input.letterType,
        draftRevision: input.draftRevision,
        letterCaseReference: input.letterCaseReference,
        templateVersionId: input.templateVersionId,
        contentSha256Prefix: input.contentSha256.slice(0, 16),
        approvalReady: input.approvalReady,
        priorDraftId: input.priorDraftId,
      }),
      correlationId: input.correlationId,
    },
    { session: input.session },
  );
}
