import "server-only";

import type { ClientSession } from "mongoose";

import {
  writeAuditEvent,
  writeAuditEventMandatory,
} from "@/modules/audit/services/audit-writer.service";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import { buildUserAuditActor } from "@/shared/audit/build-audit-actor";
import { AuditEventType } from "@/shared/audit/domain/audit-event-taxonomy";
import { AuditOutcome } from "@/shared/audit/domain/audit-outcome";

export async function recordWarningLetterFinalization(
  input: {
    context: AuthenticatedContext;
    finalDocumentId: string;
    debtCaseId: string;
    draftId: string;
    draftRevision: number;
    contentSha256: string;
    blocked: boolean;
    correlationId?: string;
  },
  session: ClientSession,
): Promise<void> {
  await writeAuditEventMandatory(
    {
      eventType: input.blocked
        ? AuditEventType.LEGAL_DOCUMENT_WARNING_LETTER_FINALIZATION_BLOCKED
        : AuditEventType.LEGAL_DOCUMENT_WARNING_LETTER_FINALIZED,
      actor: buildUserAuditActor(input.context),
      action: input.blocked
        ? "warning_letter_finalization_blocked"
        : "warning_letter_finalize",
      outcome: AuditOutcome.SUCCESS,
      target: { entityType: "warning_letter_final_document", entityId: input.finalDocumentId },
      metadata: {
        debtCaseId: input.debtCaseId,
        draftId: input.draftId,
        draftRevision: input.draftRevision,
        contentSha256Prefix: input.contentSha256.slice(0, 16),
        operativeBlocked: input.blocked,
      },
      correlationId: input.correlationId,
    },
    { session },
  );
}

export async function recordWarningLetterDeliveryEvent(input: {
  context: AuthenticatedContext;
  deliveryRecordId: string;
  debtCaseId: string;
  finalDocumentId: string;
  channel: string;
  status: string;
  correlationId?: string;
}): Promise<void> {
  await writeAuditEvent(
    {
      eventType: AuditEventType.LEGAL_DOCUMENT_WARNING_LETTER_DELIVERY_RECORDED,
      actor: buildUserAuditActor(input.context),
      action: "warning_letter_delivery_record",
      outcome: AuditOutcome.SUCCESS,
      target: { entityType: "warning_letter_delivery", entityId: input.deliveryRecordId },
      metadata: {
        debtCaseId: input.debtCaseId,
        finalDocumentId: input.finalDocumentId,
        channel: input.channel,
        deliveryStatus: input.status,
      },
      correlationId: input.correlationId,
    },
    { mandatory: true },
  );
}
