import "server-only";

import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

import { LEGAL_DOCUMENT_TEMPLATE_CATEGORY_VALUES } from "@/modules/legal-document-templates/domain/legal-document-template-category";
import { BuildingLegalDocumentStatus } from "@/modules/building-legal-documents/domain/building-legal-document-status";

const STATUS_VALUES = Object.values(BuildingLegalDocumentStatus);

const buildingLegalDocumentSchema = new Schema(
  {
    buildingLegalDocumentId: { type: String, required: true, unique: true, index: true },
    buildingId: { type: String, required: true, index: true, trim: true },
    category: {
      type: String,
      required: true,
      enum: LEGAL_DOCUMENT_TEMPLATE_CATEGORY_VALUES,
      index: true,
    },
    templateId: { type: String, required: true },
    templateRevisionId: { type: String, required: true, index: true },
    templateRevisionNumber: { type: Number, required: true, min: 1 },
    templateContentSha256: { type: String, required: true },
    renderedContentSnapshot: { type: String, required: true, default: "" },
    status: {
      type: String,
      required: true,
      enum: STATUS_VALUES,
      index: true,
    },
    createdByUserId: { type: Schema.Types.ObjectId, required: true },
    supersededAt: { type: Date, default: null },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: "building_legal_documents",
    strict: "throw",
  },
);

buildingLegalDocumentSchema.index(
  { buildingId: 1, category: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: BuildingLegalDocumentStatus.GENERATED_PENDING_SIGNATURE,
    },
    name: "unique_active_building_category_document",
  },
);

buildingLegalDocumentSchema.index(
  { buildingId: 1, category: 1, createdAt: -1 },
  { name: "building_category_history" },
);

export type BuildingLegalDocumentDocument = InferSchemaType<typeof buildingLegalDocumentSchema>;

export const BuildingLegalDocument: Model<BuildingLegalDocumentDocument> =
  mongoose.models.BuildingLegalDocument ??
  mongoose.model("BuildingLegalDocument", buildingLegalDocumentSchema);
