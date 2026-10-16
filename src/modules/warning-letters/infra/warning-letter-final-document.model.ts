import "server-only";

import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

import { WarningLetterFinalDocumentStatus } from "@/modules/warning-letters/domain/warning-letter-final-document-status";

const warningLetterFinalDocumentSchema = new Schema(
  {
    finalDocumentId: { type: String, required: true, unique: true, index: true },
    debtCaseId: { type: String, required: true, index: true },
    buildingId: { type: String, required: true, index: true },
    draftId: { type: String, required: true },
    draftRevision: { type: Number, required: true, min: 1 },
    letterCaseReference: { type: String, required: true },
    templateVersionId: { type: String, required: true },
    contentSha256: { type: String, required: true },
    materialInputsSha256: { type: String, required: true },
    contentSnapshot: { type: Schema.Types.Mixed, required: true },
    status: {
      type: String,
      enum: Object.values(WarningLetterFinalDocumentStatus),
      required: true,
    },
    finalizedByUserId: { type: Schema.Types.ObjectId, required: true },
    finalizedAt: { type: Date, required: true },
    operativeBlockReasonsHe: { type: [String], required: true, default: [] },
    pdfContentSha256: { type: String, default: null },
    pdfStorageKey: { type: String, default: null },
  },
  {
    timestamps: true,
    collection: "warning_letter_final_documents",
    strict: "throw",
  },
);

warningLetterFinalDocumentSchema.index(
  { debtCaseId: 1, draftId: 1, draftRevision: 1 },
  { unique: true, name: "unique_finalization_per_draft_revision" },
);

export type WarningLetterFinalDocumentDocument = InferSchemaType<
  typeof warningLetterFinalDocumentSchema
>;

export const WarningLetterFinalDocument: Model<WarningLetterFinalDocumentDocument> =
  mongoose.models.WarningLetterFinalDocument ??
  mongoose.model("WarningLetterFinalDocument", warningLetterFinalDocumentSchema);
