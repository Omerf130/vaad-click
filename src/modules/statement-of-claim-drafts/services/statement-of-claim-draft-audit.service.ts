import "server-only";

import type { ClientSession } from "mongoose";

import { writeAuditEventMandatory } from "@/modules/audit/services/audit-writer.service";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import { buildUserAuditActor } from "@/shared/audit/build-audit-actor";
import { AuditEventType } from "@/shared/audit/domain/audit-event-taxonomy";
import { AuditOutcome } from "@/shared/audit/domain/audit-outcome";

type DraftAuditBase = {
  context: AuthenticatedContext;
  draftId: string;
  debtCaseId: string;
  buildingId: string;
  draftRevision: number;
  templateRevisionId: string;
  contentSha256: string;
  materialInputsSha256: string;
  correlationId?: string;
  session: ClientSession;
};

function metadata(input: {
  buildingId: string;
  draftRevision: number;
  templateRevisionId: string;
  contentSha256Prefix: string;
  materialInputsSha256Prefix: string;
  priorDraftId?: string;
  created?: boolean;
}) {
  return {
    buildingId: input.buildingId,
    draftRevision: input.draftRevision,
    templateRevisionId: input.templateRevisionId,
    contentSha256Prefix: input.contentSha256Prefix,
    materialInputsSha256Prefix: input.materialInputsSha256Prefix,
    developmentOnly: true,
    ...(input.priorDraftId ? { priorDraftId: input.priorDraftId } : {}),
    ...(input.created != null ? { created: input.created } : {}),
  };
}

export async function recordStatementOfClaimDraftCreated(input: DraftAuditBase): Promise<void> {
  await writeAuditEventMandatory(
    {
      eventType: AuditEventType.LEGAL_DOCUMENT_STATEMENT_OF_CLAIM_DRAFT_CREATED,
      actor: buildUserAuditActor(input.context),
      action: "statement_of_claim_draft_create",
      outcome: AuditOutcome.SUCCESS,
      target: { entityType: "statement_of_claim_draft", entityId: input.draftId },
      metadata: metadata({
        buildingId: input.buildingId,
        draftRevision: input.draftRevision,
        templateRevisionId: input.templateRevisionId,
        contentSha256Prefix: input.contentSha256.slice(0, 12),
        materialInputsSha256Prefix: input.materialInputsSha256.slice(0, 12),
        created: true,
      }),
      correlationId: input.correlationId,
    },
    { session: input.session },
  );
}

export async function recordStatementOfClaimDraftEdited(
  input: DraftAuditBase & { priorDraftId: string; editedSectionIds: string[] },
): Promise<void> {
  await writeAuditEventMandatory(
    {
      eventType: AuditEventType.LEGAL_DOCUMENT_STATEMENT_OF_CLAIM_DRAFT_EDITED,
      actor: buildUserAuditActor(input.context),
      action: "statement_of_claim_draft_edit",
      outcome: AuditOutcome.SUCCESS,
      target: { entityType: "statement_of_claim_draft", entityId: input.draftId },
      metadata: {
        ...metadata({
          buildingId: input.buildingId,
          draftRevision: input.draftRevision,
          templateRevisionId: input.templateRevisionId,
          contentSha256Prefix: input.contentSha256.slice(0, 12),
          materialInputsSha256Prefix: input.materialInputsSha256.slice(0, 12),
          priorDraftId: input.priorDraftId,
          created: true,
        }),
        editedSectionIds: input.editedSectionIds.join(","),
        developmentOnly: true,
      },
      correlationId: input.correlationId,
    },
    { session: input.session },
  );
}

export async function recordStatementOfClaimDraftRegenerated(
  input: DraftAuditBase & { priorDraftId: string },
): Promise<void> {
  await writeAuditEventMandatory(
    {
      eventType: AuditEventType.LEGAL_DOCUMENT_STATEMENT_OF_CLAIM_DRAFT_REGENERATED,
      actor: buildUserAuditActor(input.context),
      action: "statement_of_claim_draft_regenerate",
      outcome: AuditOutcome.SUCCESS,
      target: { entityType: "statement_of_claim_draft", entityId: input.draftId },
      metadata: metadata({
        buildingId: input.buildingId,
        draftRevision: input.draftRevision,
        templateRevisionId: input.templateRevisionId,
        contentSha256Prefix: input.contentSha256.slice(0, 12),
        materialInputsSha256Prefix: input.materialInputsSha256.slice(0, 12),
        priorDraftId: input.priorDraftId,
        created: true,
      }),
      correlationId: input.correlationId,
    },
    { session: input.session },
  );
}