import "server-only";

import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

import { LEGAL_DOCUMENT_TEMPLATE_CATEGORY_VALUES } from "@/modules/legal-document-templates/domain/legal-document-template-category";
import { LegalDocumentTemplateRevisionStatus } from "@/modules/legal-document-templates/domain/legal-document-template-revision-status";

const REVISION_STATUS_VALUES = Object.values(LegalDocumentTemplateRevisionStatus);

const legalDocumentTemplateRevisionSchema = new Schema(
  {
    revisionId: { type: String, required: true, unique: true, index: true },
    templateId: { type: String, required: true, index: true },
    category: {
      type: String,
      required: true,
      enum: LEGAL_DOCUMENT_TEMPLATE_CATEGORY_VALUES,
      index: true,
    },
    revisionNumber: { type: Number, required: true, min: 1 },
    /** Empty string is valid (empty draft); do not use `required` — Mongoose treats "" as missing. */
    bodyText: { type: String, default: "" },
    contentSha256: { type: String, required: true },
    lifecycleStatus: {
      type: String,
      required: true,
      enum: REVISION_STATUS_VALUES,
      index: true,
    },
    isCurrentDraft: { type: Boolean, required: true, default: false, index: true },
    createdByUserId: { type: Schema.Types.ObjectId, required: true },
    publishedAt: { type: Date, default: null },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: "legal_document_template_revisions",
    strict: "throw",
  },
);

legalDocumentTemplateRevisionSchema.index(
  { templateId: 1, revisionNumber: 1 },
  { unique: true, name: "unique_template_revision_number" },
);

legalDocumentTemplateRevisionSchema.index(
  { templateId: 1, isCurrentDraft: 1 },
  {
    unique: true,
    partialFilterExpression: { isCurrentDraft: true },
    name: "unique_current_draft_per_template",
  },
);

export type LegalDocumentTemplateRevisionDocument = InferSchemaType<
  typeof legalDocumentTemplateRevisionSchema
>;

export const LegalDocumentTemplateRevision: Model<LegalDocumentTemplateRevisionDocument> =
  mongoose.models.LegalDocumentTemplateRevision ??
  mongoose.model("LegalDocumentTemplateRevision", legalDocumentTemplateRevisionSchema);
