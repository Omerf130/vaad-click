import "server-only";

import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

import { WarningLetterDraftInvalidationReason } from "@/modules/warning-letters/domain/warning-letter-draft-invalidation-reason";
import { WarningLetterDraftLegalApprovalStatus } from "@/modules/warning-letters/domain/warning-letter-draft-legal-approval-status";
import { WarningLetterDraftStatus } from "@/modules/warning-letters/domain/warning-letter-draft-status";
import { WarningLetterType } from "@/modules/warning-letters/domain/warning-letter-type";

const warningLetterDraftSchema = new Schema(
  {
    draftId: { type: String, required: true, unique: true, index: true },
    debtCaseId: { type: String, required: true, index: true },
    buildingId: { type: String, required: true, index: true },
    letterType: {
      type: String,
      enum: Object.values(WarningLetterType),
      required: true,
    },
    templateVersionId: { type: String, required: true },
    draftRevision: { type: Number, required: true, min: 1 },
    priorDraftId: { type: String, default: null },
    /** Stable across revisions for one debt-case letter chain; not globally unique. */
    letterCaseReference: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: Object.values(WarningLetterDraftStatus),
      required: true,
    },
    contentSnapshot: { type: Schema.Types.Mixed, required: true },
    contentSha256: { type: String, required: true },
    materialInputsSha256: { type: String, required: true },
    unapprovedTemplateVariantIds: { type: [String], required: true, default: [] },
    approvalReady: { type: Boolean, required: true },
    invalidationReason: {
      type: String,
      enum: [...Object.values(WarningLetterDraftInvalidationReason), null],
      default: null,
    },
    invalidatedAt: { type: Date, default: null },
    manuallyEdited: { type: Boolean, required: true, default: false },
    manualClauseOverrides: {
      type: Map,
      of: String,
      default: () => new Map(),
    },
    editedClauseIds: { type: [String], required: true, default: [] },
    concurrencyRevision: { type: Number, required: true, min: 1, default: 1 },
    legalWordingApprovalStatus: {
      type: String,
      enum: Object.values(WarningLetterDraftLegalApprovalStatus),
      required: true,
      default: WarningLetterDraftLegalApprovalStatus.NONE,
    },
    legalWordingApprovedAt: { type: Date, default: null },
    legalWordingApprovedByUserId: { type: Schema.Types.ObjectId, default: null },
    legalWordingApprovedContentSha256: { type: String, default: null },
    legalWordingReturnReason: { type: String, default: null },
    legalWordingReturnedAt: { type: Date, default: null },
    createdByUserId: { type: Schema.Types.ObjectId, required: true },
    updatedByUserId: { type: Schema.Types.ObjectId, required: true },
  },
  {
    timestamps: true,
    collection: "warning_letter_drafts",
    strict: "throw",
  },
);

warningLetterDraftSchema.index(
  { debtCaseId: 1, letterType: 1 },
  {
    unique: true,
    partialFilterExpression: { status: WarningLetterDraftStatus.ACTIVE },
    name: "unique_active_initial_warning_per_case",
  },
);

warningLetterDraftSchema.index({ debtCaseId: 1, draftRevision: -1 });

warningLetterDraftSchema.index(
  { debtCaseId: 1, letterType: 1, draftRevision: 1 },
  { unique: true, name: "unique_draft_revision_per_case_and_letter_type" },
);

export type WarningLetterDraftDocument = InferSchemaType<typeof warningLetterDraftSchema> & {
  draftId: string;
};

export type WarningLetterDraftModel = Model<WarningLetterDraftDocument>;

export const WarningLetterDraft: WarningLetterDraftModel =
  (mongoose.models.WarningLetterDraft as WarningLetterDraftModel | undefined) ??
  mongoose.model<WarningLetterDraftDocument>("WarningLetterDraft", warningLetterDraftSchema);
