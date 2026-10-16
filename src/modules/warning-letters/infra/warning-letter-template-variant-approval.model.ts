import "server-only";

import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const warningLetterTemplateVariantApprovalSchema = new Schema(
  {
    approvalId: { type: String, required: true, unique: true, index: true },
    variantId: { type: String, required: true, index: true },
    templateVersionId: { type: String, required: true, index: true },
    contentSha256: { type: String, required: true },
    approvedByUserId: { type: Schema.Types.ObjectId, required: true },
    approvedAt: { type: Date, required: true },
  },
  {
    timestamps: false,
    collection: "warning_letter_template_variant_approvals",
    strict: "throw",
  },
);

warningLetterTemplateVariantApprovalSchema.index(
  { variantId: 1, templateVersionId: 1, contentSha256: 1 },
  { unique: true, name: "unique_variant_version_content_approval" },
);

export type WarningLetterTemplateVariantApprovalDocument = InferSchemaType<
  typeof warningLetterTemplateVariantApprovalSchema
>;

export const WarningLetterTemplateVariantApproval: Model<WarningLetterTemplateVariantApprovalDocument> =
  mongoose.models.WarningLetterTemplateVariantApproval ??
  mongoose.model(
    "WarningLetterTemplateVariantApproval",
    warningLetterTemplateVariantApprovalSchema,
  );
