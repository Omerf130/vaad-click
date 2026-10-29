import "server-only";

import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

import { LEGAL_DOCUMENT_TEMPLATE_CATEGORY_VALUES } from "@/modules/legal-document-templates/domain/legal-document-template-category";

const legalDocumentTemplateApprovalSchema = new Schema(
  {
    approvalId: { type: String, required: true, unique: true, index: true },
    templateId: { type: String, required: true, index: true },
    revisionId: { type: String, required: true, index: true },
    category: {
      type: String,
      required: true,
      enum: LEGAL_DOCUMENT_TEMPLATE_CATEGORY_VALUES,
      index: true,
    },
    contentSha256: { type: String, required: true },
    approvedByUserId: { type: Schema.Types.ObjectId, required: true },
    approvedAt: { type: Date, required: true },
  },
  {
    timestamps: false,
    collection: "legal_document_template_approvals",
    strict: "throw",
  },
);

legalDocumentTemplateApprovalSchema.index(
  { revisionId: 1, contentSha256: 1 },
  { unique: true, name: "unique_revision_content_approval" },
);

export type LegalDocumentTemplateApprovalDocument = InferSchemaType<
  typeof legalDocumentTemplateApprovalSchema
>;

export const LegalDocumentTemplateApproval: Model<LegalDocumentTemplateApprovalDocument> =
  mongoose.models.LegalDocumentTemplateApproval ??
  mongoose.model("LegalDocumentTemplateApproval", legalDocumentTemplateApprovalSchema);
