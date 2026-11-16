import "server-only";

import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

import { LegalDocumentTemplateOperativeStatus } from "@/modules/legal-document-templates/domain/legal-document-template-operative-status";
import { StatementOfClaimDraftStatus } from "@/modules/statement-of-claim-drafts/domain/statement-of-claim-draft-status";

const statementOfClaimDraftSchema = new Schema(
  {
    draftId: { type: String, required: true, unique: true, index: true },
    debtCaseId: { type: String, required: true, index: true },
    buildingId: { type: String, required: true, index: true },
    templateRevisionId: { type: String, required: true },
    draftRevision: { type: Number, required: true, min: 1 },
    priorDraftId: { type: String, default: null },
    operativeStatus: {
      type: String,
      enum: [LegalDocumentTemplateOperativeStatus.DEVELOPMENT_ONLY],
      required: true,
      default: LegalDocumentTemplateOperativeStatus.DEVELOPMENT_ONLY,
    },
    contentSnapshot: { type: Schema.Types.Mixed, required: true },
    contentSha256: { type: String, required: true },
    materialInputsSha256: { type: String, required: true },
    status: {
      type: String,
      enum: Object.values(StatementOfClaimDraftStatus),
      required: true,
    },
    concurrencyRevision: { type: Number, required: true, min: 1, default: 1 },
    manuallyEdited: { type: Boolean, required: true, default: false },
    editedSectionIds: { type: [String], required: true, default: [] },
    supersededAt: { type: Date, default: null },
    createdByUserId: { type: Schema.Types.ObjectId, required: true },
    updatedByUserId: { type: Schema.Types.ObjectId, required: true },
  },
  {
    timestamps: true,
    collection: "statement_of_claim_drafts",
    strict: "throw",
  },
);

statementOfClaimDraftSchema.index(
  { debtCaseId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: StatementOfClaimDraftStatus.ACTIVE },
    name: "unique_active_soc_draft_per_case",
  },
);

statementOfClaimDraftSchema.index({ debtCaseId: 1, draftRevision: -1 });

statementOfClaimDraftSchema.index(
  { debtCaseId: 1, draftRevision: 1 },
  { unique: true, name: "unique_soc_draft_revision_per_case" },
);

export type StatementOfClaimDraftDocument = InferSchemaType<typeof statementOfClaimDraftSchema> & {
  draftId: string;
};

export type StatementOfClaimDraftModel = Model<StatementOfClaimDraftDocument>;

export const StatementOfClaimDraft: StatementOfClaimDraftModel =
  (mongoose.models.StatementOfClaimDraft as StatementOfClaimDraftModel | undefined) ??
  mongoose.model<StatementOfClaimDraftDocument>(
    "StatementOfClaimDraft",
    statementOfClaimDraftSchema,
  );