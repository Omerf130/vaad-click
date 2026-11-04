import "server-only";

import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

import { DebtCaseIntakeDraftStatus } from "@/modules/debt-cases/domain/debt-case-intake-draft-status";

const buildingSnapshotSchema = new Schema(
  {
    displayName: { type: String, trim: true, default: "" },
    city: { type: String, trim: true, default: "" },
    street: { type: String, trim: true, default: "" },
    houseNumber: { type: String, trim: true, default: "" },
    postalCode: { type: String, trim: true, default: null },
    normalizedAddressKey: { type: String, trim: true, default: null },
  },
  { _id: false },
);

const debtCaseIntakeDraftSchema = new Schema(
  {
    intakeDraftId: { type: String, required: true, unique: true, trim: true },
    createdByUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    status: {
      type: String,
      enum: Object.values(DebtCaseIntakeDraftStatus),
      required: true,
      default: DebtCaseIntakeDraftStatus.DRAFT,
    },
    /** existing | new — server-derived for reps with assignment */
    buildingSelectionMode: {
      type: String,
      enum: ["existing", "new"],
      required: true,
      default: "new",
    },
    existingBuildingId: { type: String, trim: true, default: null },
    buildingSnapshot: { type: buildingSnapshotSchema, default: () => ({}) },
    caseDraftJson: { type: Schema.Types.Mixed, default: () => ({}) },
    platformFeePreference: { type: String, trim: true, default: null },
    documentAssetIds: { type: [String], default: [] },
    linkedDebtCaseId: { type: String, trim: true, default: null },
    buildingAssociationReviewId: { type: String, trim: true, default: null },
    submitIdempotencyKey: { type: String, trim: true, default: null, sparse: true },
    revision: { type: Number, required: true, default: 0 },
    submittedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: "debt_case_intake_drafts" },
);

debtCaseIntakeDraftSchema.index(
  { createdByUserId: 1, status: 1, updatedAt: -1 },
  { name: "intake_drafts_by_user" },
);
debtCaseIntakeDraftSchema.index(
  { submitIdempotencyKey: 1 },
  { unique: true, partialFilterExpression: { submitIdempotencyKey: { $type: "string" } } },
);

export type DebtCaseIntakeDraftDocument = InferSchemaType<typeof debtCaseIntakeDraftSchema> & {
  _id: mongoose.Types.ObjectId;
};

export type DebtCaseIntakeDraftModel = Model<DebtCaseIntakeDraftDocument>;

export const DebtCaseIntakeDraft: DebtCaseIntakeDraftModel =
  (mongoose.models.DebtCaseIntakeDraft as DebtCaseIntakeDraftModel | undefined) ??
  mongoose.model<DebtCaseIntakeDraftDocument>(
    "DebtCaseIntakeDraft",
    debtCaseIntakeDraftSchema,
  );
