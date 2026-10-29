import "server-only";

import { writeAuditEvent } from "@/modules/audit/services/audit-writer.service";
import type { LegalDocumentTemplateCategory } from "@/modules/legal-document-templates/domain/legal-document-template-category";
import { buildUserAuditActor } from "@/shared/audit/build-audit-actor";
import { AuditEventType } from "@/shared/audit/domain/audit-event-taxonomy";
import { AuditOutcome } from "@/shared/audit/domain/audit-outcome";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";

type BuildingLegalDocumentPdfAuditInput = {
  context: AuthenticatedContext;
  buildingId: string;
  buildingLegalDocumentId: string;
  category: LegalDocumentTemplateCategory;
  correlationId?: string;
};

export async function recordBuildingLegalDocumentPdfViewed(
  input: BuildingLegalDocumentPdfAuditInput,
): Promise<void> {
  await writeAuditEvent(
    {
      eventType: AuditEventType.LEGAL_DOCUMENT_BUILDING_INSTANCE_PDF_VIEWED,
      actor: buildUserAuditActor(input.context),
      action: "building_legal_document_pdf_view",
      outcome: AuditOutcome.SUCCESS,
      target: {
        entityType: "building_legal_document",
        entityId: input.buildingLegalDocumentId,
      },
      metadata: {
        buildingId: input.buildingId,
        category: input.category,
      },
      correlationId: input.correlationId,
    },
    { mandatory: true },
  );
}

export async function recordBuildingLegalDocumentPdfDownloaded(
  input: BuildingLegalDocumentPdfAuditInput,
): Promise<void> {
  await writeAuditEvent(
    {
      eventType: AuditEventType.LEGAL_DOCUMENT_BUILDING_INSTANCE_PDF_DOWNLOADED,
      actor: buildUserAuditActor(input.context),
      action: "building_legal_document_pdf_download",
      outcome: AuditOutcome.SUCCESS,
      target: {
        entityType: "building_legal_document",
        entityId: input.buildingLegalDocumentId,
      },
      metadata: {
        buildingId: input.buildingId,
        category: input.category,
      },
      correlationId: input.correlationId,
    },
    { mandatory: true },
  );
}
