import "server-only";

import { randomUUID } from "node:crypto";

import mongoose from "mongoose";
import { Types } from "mongoose";

import { BuildingOrganizationalStatus } from "@/modules/buildings/domain/building-status";
import { Building } from "@/modules/buildings/infra/building.model";
import { defaultAccessPolicyForClassification } from "@/modules/document-assets/domain/document-access-policy";
import { DOCUMENT_UPLOAD_INTENT_TTL_MS } from "@/modules/document-assets/domain/document-content-policy";
import { DocumentClassification } from "@/modules/document-assets/domain/document-classification";
import {
  DocumentAssetError,
  DocumentAssetErrorCode,
} from "@/modules/document-assets/domain/document-asset-errors";
import { DocumentAssetStatus } from "@/modules/document-assets/domain/document-asset-status";
import { DocumentOwnerEntityType } from "@/modules/document-assets/domain/document-owner-entity-type";
import { assertDocumentStatusTransition } from "@/modules/document-assets/domain/document-status-transitions";
import { DocumentAsset } from "@/modules/document-assets/infra/document-asset.model";
import { getDocumentStorageCapability } from "@/modules/document-assets/infra/document-storage-registry";
import {
  authorizeDocumentAssetAccess,
  assertDocumentReadableByStatus,
  DocumentAssetAccessIntent,
} from "@/modules/document-assets/services/document-asset-authorization.service";
import {
  recordDocumentAssetDownloaded,
  recordDocumentAssetSoftDeleted,
  recordDocumentAssetUploadRejected,
} from "@/modules/document-assets/services/document-asset-audit.service";
import { assertLawyerAdminOrganization } from "@/modules/organizations/services/assert-lawyer-admin";
import {
  formatDocumentClassificationHe,
} from "@/modules/document-assets/presentation/document-messages.he";
import type {
  AdminDocumentAssetListItem,
  DocumentStorageUiState,
  PortalDocumentAssetListItem,
} from "@/modules/document-assets/presentation/document-asset-view.types";
import { getDebtCase } from "@/modules/debt-cases/services/debt-case.service";
import type { InitiateDocumentUploadInput } from "@/modules/document-assets/validation/document-asset.schema";
import {
  assertCp7UploadClassification,
  initiateDocumentUploadInputSchema,
} from "@/modules/document-assets/validation/document-asset.schema";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import { AuditWriteFailedError } from "@/shared/audit/errors/audit-errors";
import { connectMongo } from "@/shared/db/connect";

export type {
  AdminDocumentAssetListItem,
  DocumentStorageUiState,
} from "@/modules/document-assets/presentation/document-asset-view.types";

export function getDocumentStorageUiState(): DocumentStorageUiState {
  const capability = getDocumentStorageCapability();
  return {
    configured: capability.state === "configured",
    state: capability.state === "configured" ? "configured" : "storage_not_configured",
  };
}

async function requireActiveBuilding(buildingId: string): Promise<void> {
  const building = await Building.findOne({
    buildingId,
    organizationalStatus: BuildingOrganizationalStatus.ACTIVE,
  }).lean();
  if (!building) {
    throw new DocumentAssetError(DocumentAssetErrorCode.NOT_FOUND, "Building not found");
  }
}

function mapAuditPersistenceError(error: unknown): never {
  if (error instanceof AuditWriteFailedError) {
    throw new DocumentAssetError(
      DocumentAssetErrorCode.AUDIT_PERSISTENCE,
      "Document operation could not be recorded",
    );
  }
  throw error;
}

export async function listBuildingDocumentAssetsForLawyerAdmin(input: {
  context: AuthenticatedContext;
  buildingId: string;
}): Promise<AdminDocumentAssetListItem[]> {
  assertLawyerAdminOrganization(input.context);
  await requireActiveBuilding(input.buildingId);

  await connectMongo();
  const rows = await DocumentAsset.find({
    buildingId: input.buildingId,
    deletedAt: null,
    status: { $ne: DocumentAssetStatus.SOFT_DELETED },
  })
    .sort({ createdAt: -1 })
    .lean();

  return rows.map((row) => ({
    documentAssetId: row.documentAssetId,
    classification: row.classification as DocumentClassification,
    status: row.status as DocumentAssetStatus,
    createdAtIso: row.createdAt.toISOString(),
    byteSize: row.byteSize ?? null,
  }));
}

function mapPortalDocumentListItem(row: {
  classification: string;
  status: string;
  createdAt: Date;
  originalFilename?: string | null;
  byteSize?: number | null;
}): PortalDocumentAssetListItem {
  const classification = row.classification as DocumentClassification;
  const filename = row.originalFilename?.trim();
  return {
    classification,
    status: row.status as DocumentAssetStatus,
    createdAtIso: row.createdAt.toISOString(),
    displayName: filename || formatDocumentClassificationHe(classification),
    byteSize: row.byteSize ?? null,
  };
}

async function listDebtCaseDocumentRows(debtCaseId: string, buildingId: string) {
  await connectMongo();
  return DocumentAsset.find({
    buildingId,
    ownerEntityType: DocumentOwnerEntityType.DEBT_CASE,
    ownerEntityId: debtCaseId,
    deletedAt: null,
    status: { $ne: DocumentAssetStatus.SOFT_DELETED },
  })
    .sort({ createdAt: -1 })
    .lean();
}

export async function listDebtCaseDocumentAssetsForCasePortal(input: {
  context: AuthenticatedContext;
  debtCaseId: string;
}): Promise<PortalDocumentAssetListItem[]> {
  const record = await getDebtCase({ context: input.context, debtCaseId: input.debtCaseId });
  const rows = await listDebtCaseDocumentRows(input.debtCaseId, record.buildingId);
  const visible: PortalDocumentAssetListItem[] = [];

  for (const row of rows) {
    try {
      await authorizeDocumentAssetAccess({
        context: input.context,
        document: row,
        intent: DocumentAssetAccessIntent.LIST,
      });
      visible.push(mapPortalDocumentListItem(row));
    } catch {
      // Document exists but is not visible to this operator — do not leak metadata.
    }
  }

  return visible;
}

export async function listDebtCaseDocumentAssetsForLawyerAdmin(input: {
  context: AuthenticatedContext;
  debtCaseId: string;
  buildingId: string;
}): Promise<AdminDocumentAssetListItem[]> {
  assertLawyerAdminOrganization(input.context);
  await requireActiveBuilding(input.buildingId);
  const rows = await listDebtCaseDocumentRows(input.debtCaseId, input.buildingId);
  return rows.map((row) => ({
    documentAssetId: row.documentAssetId,
    classification: row.classification as DocumentClassification,
    status: row.status as DocumentAssetStatus,
    createdAtIso: row.createdAt.toISOString(),
    byteSize: row.byteSize ?? null,
  }));
}

export async function initiateDocumentAssetUpload(input: {
  context: AuthenticatedContext;
  payload: InitiateDocumentUploadInput;
  correlationId?: string;
}): Promise<never> {
  assertLawyerAdminOrganization(input.context);
  const parsed = initiateDocumentUploadInputSchema.parse(input.payload);
  assertCp7UploadClassification(parsed.classification);
  await requireActiveBuilding(parsed.buildingId);

  const capability = getDocumentStorageCapability();
  if (capability.state !== "configured") {
    try {
      await recordDocumentAssetUploadRejected({
        buildingId: parsed.buildingId,
        classification: parsed.classification,
        reasonCode: "storage_not_configured",
        context: input.context,
        correlationId: input.correlationId,
      });
    } catch (error) {
      mapAuditPersistenceError(error);
    }
    throw new DocumentAssetError(
      DocumentAssetErrorCode.STORAGE_NOT_CONFIGURED,
      "Document storage is not configured",
    );
  }

  throw new DocumentAssetError(
    DocumentAssetErrorCode.STORAGE_NOT_CONFIGURED,
    "Document storage is not configured",
  );
}

export async function downloadDocumentAssetContent(input: {
  context: AuthenticatedContext;
  documentAssetId: string;
  correlationId?: string;
  lawyerAdminBuildingWorkflow?: boolean;
}): Promise<never> {
  await connectMongo();
  const document = await DocumentAsset.findOne({
    documentAssetId: input.documentAssetId,
    deletedAt: null,
  }).lean();

  if (!document) {
    throw new DocumentAssetError(DocumentAssetErrorCode.NOT_FOUND, "Document not found");
  }

  await authorizeDocumentAssetAccess({
    context: input.context,
    document,
    intent: DocumentAssetAccessIntent.READ,
    lawyerAdminBuildingWorkflow: input.lawyerAdminBuildingWorkflow,
  });

  assertDocumentReadableByStatus(document.status as DocumentAssetStatus);

  const capability = getDocumentStorageCapability();
  if (capability.state !== "configured" || !document.storageKey) {
    throw new DocumentAssetError(
      DocumentAssetErrorCode.STORAGE_NOT_CONFIGURED,
      "Document storage is not configured",
    );
  }

  try {
    await recordDocumentAssetDownloaded({
      documentAssetId: document.documentAssetId,
      buildingId: document.buildingId,
      classification: document.classification as DocumentClassification,
      context: input.context,
      correlationId: input.correlationId,
    });
  } catch (error) {
    mapAuditPersistenceError(error);
  }

  throw new DocumentAssetError(
    DocumentAssetErrorCode.STORAGE_UNAVAILABLE,
    "Download path not implemented",
  );
}

export async function softDeleteDocumentAsset(input: {
  context: AuthenticatedContext;
  documentAssetId: string;
  correlationId?: string;
  lawyerAdminBuildingWorkflow?: boolean;
}): Promise<void> {
  assertLawyerAdminOrganization(input.context);
  await connectMongo();
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const document = await DocumentAsset.findOne({
        documentAssetId: input.documentAssetId,
        deletedAt: null,
      })
        .session(session)
        .lean();

      if (!document) {
        throw new DocumentAssetError(DocumentAssetErrorCode.NOT_FOUND, "Document not found");
      }

      await authorizeDocumentAssetAccess({
        context: input.context,
        document,
        intent: DocumentAssetAccessIntent.DELETE,
        lawyerAdminBuildingWorkflow: input.lawyerAdminBuildingWorkflow,
      });

      assertDocumentStatusTransition(
        document.status as DocumentAssetStatus,
        DocumentAssetStatus.SOFT_DELETED,
      );

      const updated = await DocumentAsset.findOneAndUpdate(
        {
          _id: document._id,
          status: document.status,
          deletedAt: null,
        },
        {
          $set: {
            status: DocumentAssetStatus.SOFT_DELETED,
            deletedAt: new Date(),
          },
        },
        { new: true, session },
      ).lean();

      if (!updated) {
        throw new DocumentAssetError(
          DocumentAssetErrorCode.VALIDATION,
          "Document could not be deleted",
        );
      }

      await recordDocumentAssetSoftDeleted({
        documentAssetId: document.documentAssetId,
        buildingId: document.buildingId,
        classification: document.classification as DocumentClassification,
        context: input.context,
        correlationId: input.correlationId,
        session,
      });
    });
  } catch (error) {
    mapAuditPersistenceError(error);
    throw error;
  } finally {
    await session.endSession();
  }
}

/** Reserved for storage activation — creates pending_upload row after storage is configured. */
export function buildPendingDocumentAssetDraft(input: {
  buildingId: string;
  classification: DocumentClassification;
  uploadedByUserId: string;
  originalFilename: string;
  declaredMimeType: string;
  ownerEntityId: string;
}) {
  const accessPolicy = defaultAccessPolicyForClassification(input.classification);
  return {
    documentAssetId: randomUUID(),
    buildingId: input.buildingId,
    ownerEntityType: DocumentOwnerEntityType.BUILDING,
    ownerEntityId: input.ownerEntityId,
    classification: input.classification,
    originalFilename: input.originalFilename,
    declaredMimeType: input.declaredMimeType,
    uploadedByUserId: new Types.ObjectId(input.uploadedByUserId),
    status: DocumentAssetStatus.PENDING_UPLOAD,
    accessPolicy,
    uploadIntentExpiresAt: new Date(Date.now() + DOCUMENT_UPLOAD_INTENT_TTL_MS),
  };
}
