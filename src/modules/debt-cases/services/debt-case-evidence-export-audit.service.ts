import "server-only";

import { writeAuditEvent } from "@/modules/audit/services/audit-writer.service";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import { buildUserAuditActor } from "@/shared/audit/build-audit-actor";
import { AuditEventType } from "@/shared/audit/domain/audit-event-taxonomy";
import { AuditOutcome } from "@/shared/audit/domain/audit-outcome";

export async function recordDebtCaseEvidenceExportCreated(input: {
  context: AuthenticatedContext;
  debtCaseId: string;
  buildingId: string;
  inventoryItemIds: string[];
  correlationId?: string;
}): Promise<void> {
  await writeAuditEvent(
    {
    eventType: AuditEventType.DEBT_CASE_EVIDENCE_EXPORT_CREATED,
    actor: buildUserAuditActor(input.context),
    action: "debt_case_evidence_export",
    outcome: AuditOutcome.SUCCESS,
    target: { entityType: "debt_case", entityId: input.debtCaseId },
    metadata: {
      buildingId: input.buildingId,
      itemCount: input.inventoryItemIds.length,
      inventoryItemIds: input.inventoryItemIds.join(",").slice(0, 2000),
    },
    correlationId: input.correlationId,
    },
    { mandatory: true },
  );
}