import "server-only";

import type { ClientSession } from "mongoose";

import {
  writeAuditEvent,
  writeAuditEventMandatory,
} from "@/modules/audit/services/audit-writer.service";
import type { DocumentClassification } from "@/modules/document-assets/domain/document-classification";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import { buildUserAuditActor } from "@/shared/audit/build-audit-actor";
import { AuditEventType } from "@/shared/audit/domain/audit-event-taxonomy";
import { AuditOutcome } from "@/shared/audit/domain/audit-outcome";

type DocumentAssetAuditTarget = {
  documentAssetId: string;
  buildingId: string;
  classification: DocumentClassification;
  context: AuthenticatedContext;
  correlationId?: string;
  session?: ClientSession;
};

function safeDocumentMetadata(input: {
  classification: DocumentClassification;
  byteSize?: number;
  detectedMimeType?: string;
  reasonCode?: string;
}) {
  return {
    classification: input.classification,
    ...(input.byteSize != null ? { byteSize: input.byteSize } : {}),
    ...(input.detectedMimeType ? { detectedMimeType: input.detectedMimeType } : {}),
    ...(input.reasonCode ? { reasonCode: input.reasonCode } : {}),
  };
}

export async function recordDocumentAssetUploadInitiated(
  input: DocumentAssetAuditTarget,
): Promise<void> {
  const payload = {
    eventType: AuditEventType.LEGAL_DOCUMENT_ASSET_UPLOAD_INITIATED,
    actor: buildUserAuditActor(input.context),
    action: "document_asset_upload_initiate",
    outcome: AuditOutcome.SUCCESS,
    target: { entityType: "document_asset", entityId: input.documentAssetId },
    metadata: {
      buildingId: input.buildingId,
      ...safeDocumentMetadata({ classification: input.classification }),
    },
    correlationId: input.correlationId,
  };
  if (input.session) {
    await writeAuditEventMandatory(payload, { session: input.session });
    return;
  }
  await writeAuditEvent(payload, { mandatory: true });
}

export async function recordDocumentAssetUploadCompleted(
  input: DocumentAssetAuditTarget & {
    byteSize: number;
    detectedMimeType: string;
    session: ClientSession;
  },
): Promise<void> {
  await writeAuditEventMandatory(
    {
      eventType: AuditEventType.LEGAL_DOCUMENT_ASSET_UPLOAD_COMPLETED,
      actor: buildUserAuditActor(input.context),
      action: "document_asset_upload_complete",
      outcome: AuditOutcome.SUCCESS,
      target: { entityType: "document_asset", entityId: input.documentAssetId },
      metadata: {
        buildingId: input.buildingId,
        ...safeDocumentMetadata({
          classification: input.classification,
          byteSize: input.byteSize,
          detectedMimeType: input.detectedMimeType,
        }),
      },
      correlationId: input.correlationId,
    },
    { session: input.session },
  );
}

export async function recordDocumentAssetUploadRejected(input: {
  buildingId: string;
  classification: DocumentClassification;
  reasonCode: string;
  context: AuthenticatedContext;
  correlationId?: string;
  documentAssetId?: string;
}): Promise<void> {
  await writeAuditEvent(
    {
      eventType: AuditEventType.LEGAL_DOCUMENT_ASSET_UPLOAD_REJECTED,
      actor: buildUserAuditActor(input.context),
      action: "document_asset_upload_reject",
      outcome: AuditOutcome.FAILURE,
      target: {
        entityType: "document_asset",
        entityId: input.documentAssetId ?? input.buildingId,
      },
      metadata: {
        buildingId: input.buildingId,
        ...safeDocumentMetadata({
          classification: input.classification,
          reasonCode: input.reasonCode,
        }),
      },
      correlationId: input.correlationId,
    },
    { mandatory: true },
  );
}

export async function recordDocumentAssetDownloaded(
  input: DocumentAssetAuditTarget & { session?: ClientSession },
): Promise<void> {
  const payload = {
    eventType: AuditEventType.LEGAL_DOCUMENT_ASSET_DOWNLOADED,
    actor: buildUserAuditActor(input.context),
    action: "document_asset_download",
    outcome: AuditOutcome.SUCCESS,
    target: { entityType: "document_asset", entityId: input.documentAssetId },
    metadata: {
      buildingId: input.buildingId,
      ...safeDocumentMetadata({ classification: input.classification }),
    },
    correlationId: input.correlationId,
  };
  if (input.session) {
    await writeAuditEventMandatory(payload, { session: input.session });
    return;
  }
  await writeAuditEvent(payload, { mandatory: true });
}

export async function recordDocumentAssetSoftDeleted(
  input: DocumentAssetAuditTarget & { session: ClientSession },
): Promise<void> {
  await writeAuditEventMandatory(
    {
      eventType: AuditEventType.LEGAL_DOCUMENT_ASSET_SOFT_DELETED,
      actor: buildUserAuditActor(input.context),
      action: "document_asset_soft_delete",
      outcome: AuditOutcome.SUCCESS,
      target: { entityType: "document_asset", entityId: input.documentAssetId },
      metadata: {
        buildingId: input.buildingId,
        ...safeDocumentMetadata({ classification: input.classification }),
      },
      correlationId: input.correlationId,
    },
    { session: input.session },
  );
}

export async function recordDocumentAssetQuarantined(
  input: DocumentAssetAuditTarget & { reasonCode: string; session: ClientSession },
): Promise<void> {
  await writeAuditEventMandatory(
    {
      eventType: AuditEventType.LEGAL_DOCUMENT_ASSET_QUARANTINED,
      actor: buildUserAuditActor(input.context),
      action: "document_asset_quarantine",
      outcome: AuditOutcome.SUCCESS,
      target: { entityType: "document_asset", entityId: input.documentAssetId },
      metadata: {
        buildingId: input.buildingId,
        ...safeDocumentMetadata({
          classification: input.classification,
          reasonCode: input.reasonCode,
        }),
      },
      correlationId: input.correlationId,
    },
    { session: input.session },
  );
}
