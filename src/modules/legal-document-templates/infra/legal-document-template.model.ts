import "server-only";

import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

import { LEGAL_DOCUMENT_TEMPLATE_CATEGORY_VALUES } from "@/modules/legal-document-templates/domain/legal-document-template-category";

const legalDocumentTemplateSchema = new Schema(
  {
    templateId: { type: String, required: true, unique: true, index: true },
    category: {
      type: String,
      required: true,
      enum: LEGAL_DOCUMENT_TEMPLATE_CATEGORY_VALUES,
      unique: true,
      index: true,
    },
    currentDraftRevisionId: { type: String, default: null },
    latestPublishedRevisionId: { type: String, default: null },
  },
  {
    timestamps: true,
    collection: "legal_document_templates",
    strict: "throw",
  },
);

export type LegalDocumentTemplateDocument = InferSchemaType<
  typeof legalDocumentTemplateSchema
>;

export const LegalDocumentTemplate: Model<LegalDocumentTemplateDocument> =
  mongoose.models.LegalDocumentTemplate ??
  mongoose.model("LegalDocumentTemplate", legalDocumentTemplateSchema);
