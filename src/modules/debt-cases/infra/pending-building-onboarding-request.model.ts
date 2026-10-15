import "server-only";

import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

import { PendingBuildingOnboardingStatus } from "@/modules/debt-cases/domain/pending-building-onboarding-status";

const pendingBuildingOnboardingRequestSchema = new Schema(
  {
    onboardingRequestId: { type: String, required: true, unique: true, trim: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    status: {
      type: String,
      enum: Object.values(PendingBuildingOnboardingStatus),
      required: true,
      default: PendingBuildingOnboardingStatus.OPEN,
    },
    /** Set only by lawyer-admin server action — never from client-supplied building UUID alone. */
    buildingId: { type: String, trim: true, default: null },
    boundAt: { type: Date, default: null },
    boundByUserId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    createdByUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    closedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: "pending_building_onboarding_requests" },
);

pendingBuildingOnboardingRequestSchema.index(
  { userId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: [PendingBuildingOnboardingStatus.OPEN, PendingBuildingOnboardingStatus.BOUND] },
    },
  },
);

export type PendingBuildingOnboardingRequestDocument = InferSchemaType<
  typeof pendingBuildingOnboardingRequestSchema
> & {
  _id: mongoose.Types.ObjectId;
};

export type PendingBuildingOnboardingRequestModel = Model<PendingBuildingOnboardingRequestDocument>;

export const PendingBuildingOnboardingRequest: PendingBuildingOnboardingRequestModel =
  (mongoose.models.PendingBuildingOnboardingRequest as
    | PendingBuildingOnboardingRequestModel
    | undefined) ??
  mongoose.model<PendingBuildingOnboardingRequestDocument>(
    "PendingBuildingOnboardingRequest",
    pendingBuildingOnboardingRequestSchema,
  );
