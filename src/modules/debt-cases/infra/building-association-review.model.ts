import "server-only";

import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

import { BuildingAssociationReviewStatus } from "@/modules/debt-cases/domain/debt-case-intake-draft-status";

const buildingSnapshotSchema = new Schema(
  {
    displayName: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    street: { type: String, required: true, trim: true },
    houseNumber: { type: String, required: true, trim: true },
    postalCode: { type: String, trim: true, default: null },
    normalizedAddressKey: { type: String, required: true, trim: true },
  },
  { _id: false },
);

const buildingAssociationReviewSchema = new Schema(
  {
    reviewId: { type: String, required: true, unique: true, trim: true },
    intakeDraftId: { type: String, required: true, trim: true, index: true },
    submittedByUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    submitterRole: { type: String, required: true, trim: true },
    buildingSnapshot: { type: buildingSnapshotSchema, required: true },
    caseSubmitPayloadJson: { type: Schema.Types.Mixed, required: true },
    documentAssetIds: { type: [String], default: [] },
    status: {
      type: String,
      enum: Object.values(BuildingAssociationReviewStatus),
      required: true,
      default: BuildingAssociationReviewStatus.OPEN,
    },
    resolvedBuildingId: { type: String, trim: true, default: null },
    resolvedDebtCaseId: { type: String, trim: true, default: null },
    resolvedAt: { type: Date, default: null },
    resolvedByUserId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    resolutionNoteInternal: { type: String, trim: true, default: null },
  },
  { timestamps: true, collection: "building_association_reviews" },
);

buildingAssociationReviewSchema.index({ status: 1, createdAt: -1 });

export type BuildingAssociationReviewDocument = InferSchemaType<
  typeof buildingAssociationReviewSchema
> & {
  _id: mongoose.Types.ObjectId;
};

export type BuildingAssociationReviewModel = Model<BuildingAssociationReviewDocument>;

export const BuildingAssociationReview: BuildingAssociationReviewModel =
  (mongoose.models.BuildingAssociationReview as BuildingAssociationReviewModel | undefined) ??
  mongoose.model<BuildingAssociationReviewDocument>(
    "BuildingAssociationReview",
    buildingAssociationReviewSchema,
  );
