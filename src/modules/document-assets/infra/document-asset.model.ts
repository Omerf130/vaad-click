import "server-only";

import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

import { DOCUMENT_CLASSIFICATIONS } from "@/modules/document-assets/domain/document-classification";
import { DOCUMENT_ASSET_STATUSES } from "@/modules/document-assets/domain/document-asset-status";
import { DOCUMENT_OWNER_ENTITY_TYPES } from "@/modules/document-assets/domain/document-owner-entity-type";
import { DocumentStorageProvider } from "@/modules/document-assets/domain/document-storage-provider";

const accessPolicySchema = new Schema(
  {
    managementCompanyMayView: { type: Boolean, required: true, default: false },
    buildingOperatorsMayUpload: { type: Boolean, required: true, default: false },
    lawyerAdminOnlyRead: { type: Boolean, required: true, default: false },
  },
  { _id: false },
);

const documentAssetSchema = new Schema(
  {
    documentAssetId: { type: String, required: true, unique: true, trim: true },
    buildingId: { type: String, required: true, index: true, trim: true },
    ownerEntityType: {
      type: String,
      required: true,
      enum: DOCUMENT_OWNER_ENTITY_TYPES,
    },
    ownerEntityId: { type: String, required: true, trim: true },
    classification: {
      type: String,
      required: true,
      enum: DOCUMENT_CLASSIFICATIONS,
    },
    originalFilename: { type: String, required: false, maxlength: 255 },
    storageProvider: {
      type: String,
      required: false,
      enum: Object.values(DocumentStorageProvider),
    },
    storageBucket: { type: String, required: false, maxlength: 128 },
    storageKey: { type: String, required: false, unique: true, sparse: true },
    declaredMimeType: { type: String, required: false, maxlength: 128 },
    detectedMimeType: { type: String, required: false, maxlength: 128 },
    byteSize: { type: Number, required: false, min: 0 },
    sha256Checksum: { type: String, required: false, maxlength: 64 },
    uploadedByUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      required: true,
      enum: DOCUMENT_ASSET_STATUSES,
    },
    accessPolicy: { type: accessPolicySchema, required: true },
    quarantineReason: { type: String, required: false, maxlength: 500 },
    deletedAt: { type: Date, required: false, default: null },
    retainUntil: { type: Date, required: false, default: null },
    uploadIntentExpiresAt: { type: Date, required: false, default: null },
  },
  {
    timestamps: true,
    collection: "document_assets",
    strict: "throw",
  },
);

documentAssetSchema.index(
  { buildingId: 1, status: 1, classification: 1, createdAt: -1 },
  { name: "document_assets_building_list" },
);

documentAssetSchema.index(
  { ownerEntityType: 1, ownerEntityId: 1, status: 1 },
  { name: "document_assets_owner" },
);

documentAssetSchema.index(
  { status: 1, uploadIntentExpiresAt: 1 },
  {
    partialFilterExpression: { status: "pending_upload" },
    name: "document_assets_pending_upload_expiry",
  },
);

export type DocumentAssetDocument = InferSchemaType<typeof documentAssetSchema> & {
  _id: mongoose.Types.ObjectId;
};

export type DocumentAssetModel = Model<DocumentAssetDocument>;

export const DocumentAsset: DocumentAssetModel =
  (mongoose.models.DocumentAsset as DocumentAssetModel | undefined) ??
  mongoose.model<DocumentAssetDocument>("DocumentAsset", documentAssetSchema);
