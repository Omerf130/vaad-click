import { z } from "zod";

import {
  DOCUMENT_CLASSIFICATIONS,
  DocumentClassification,
  isCp7EnabledClassification,
} from "@/modules/document-assets/domain/document-classification";
import {
  DOCUMENT_ASSET_STATUSES,
  DocumentAssetStatus,
} from "@/modules/document-assets/domain/document-asset-status";
import {
  DOCUMENT_OWNER_ENTITY_TYPES,
  DocumentOwnerEntityType,
} from "@/modules/document-assets/domain/document-owner-entity-type";
import {
  APPROVED_DOCUMENT_MIME_TYPES,
  type ApprovedDocumentMimeType,
} from "@/modules/document-assets/domain/document-content-policy";

const approvedMimeTypeSchema = z.enum(
  APPROVED_DOCUMENT_MIME_TYPES as unknown as [
    ApprovedDocumentMimeType,
    ...ApprovedDocumentMimeType[],
  ],
);

export const documentAccessPolicySchema = z.object({
  managementCompanyMayView: z.boolean(),
  buildingOperatorsMayUpload: z.boolean(),
  lawyerAdminOnlyRead: z.boolean(),
});

export const documentAssetRecordSchema = z
  .object({
    documentAssetId: z.string().uuid(),
    buildingId: z.string().uuid(),
    ownerEntityType: z.enum(
      DOCUMENT_OWNER_ENTITY_TYPES as [DocumentOwnerEntityType, ...DocumentOwnerEntityType[]],
    ),
    ownerEntityId: z.string().min(1).max(128),
    classification: z.enum(
      DOCUMENT_CLASSIFICATIONS as [DocumentClassification, ...DocumentClassification[]],
    ),
    status: z.enum(
      DOCUMENT_ASSET_STATUSES as [DocumentAssetStatus, ...DocumentAssetStatus[]],
    ),
    accessPolicy: documentAccessPolicySchema,
    storageKey: z.string().min(1).max(512).optional().nullable(),
    storageProvider: z.string().max(64).optional().nullable(),
    sha256Checksum: z.string().length(64).optional().nullable(),
    byteSize: z.number().int().nonnegative().optional().nullable(),
    detectedMimeType: approvedMimeTypeSchema.optional().nullable(),
  })
  .superRefine((value, ctx) => {
    if (value.status === DocumentAssetStatus.ACTIVE) {
      if (!value.storageKey || !value.storageProvider || !value.sha256Checksum) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Active documents require storage metadata and checksum",
          path: ["status"],
        });
      }
      if (value.byteSize == null || !value.detectedMimeType) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Active documents require byte size and detected MIME type",
          path: ["status"],
        });
      }
    }
  });

export const initiateDocumentUploadInputSchema = z.object({
  buildingId: z.string().uuid(),
  classification: z.enum(
    DOCUMENT_CLASSIFICATIONS as [DocumentClassification, ...DocumentClassification[]],
  ),
  declaredMimeType: approvedMimeTypeSchema,
  originalFilename: z.string().min(1).max(255),
});

export type InitiateDocumentUploadInput = z.infer<typeof initiateDocumentUploadInputSchema>;

export function assertCp7UploadClassification(
  classification: DocumentClassification,
): void {
  if (!isCp7EnabledClassification(classification)) {
    throw new Error("Classification not enabled in CP7");
  }
}
