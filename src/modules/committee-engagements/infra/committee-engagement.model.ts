import "server-only";

import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

import { BankAccountCollectionStatus } from "@/modules/committee-engagements/domain/bank-account-collection-status";
import { CommitteeEngagementStatus } from "@/modules/committee-engagements/domain/engagement-status";

const proposedTermsSnapshotSchema = new Schema(
  {
    payload: { type: Schema.Types.Mixed, required: true },
  },
  { _id: false },
);

const committeeEngagementSchema = new Schema(
  {
    engagementId: { type: String, required: true, unique: true, trim: true },
    buildingId: { type: String, required: true, trim: true, index: true },
    status: {
      type: String,
      required: true,
      enum: Object.values(CommitteeEngagementStatus),
      default: CommitteeEngagementStatus.PROPOSED_TERMS,
    },
    proposedTermsSnapshot: { type: proposedTermsSnapshotSchema, required: false, default: null },
    signedTermsSnapshot: { type: proposedTermsSnapshotSchema, required: false, default: null },
    signedAt: { type: Date, default: null },
    signedByUserId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    sourceSettingsVersionId: { type: String, required: true, trim: true },
    sourceVersionNumber: { type: Number, required: true, min: 1 },
    proposedTermsCapturedAt: { type: Date, required: true },
    proposedTermsCapturedByUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    bankAccountCollectionStatus: {
      type: String,
      enum: Object.values(BankAccountCollectionStatus),
      default: BankAccountCollectionStatus.NOT_COLLECTED,
    },
    /** Always false in CP6D — no outbound transfers without bank approval and signature. */
    outboundTransfersAllowed: { type: Boolean, required: true, default: false },
    createdByUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true, collection: "committee_engagements" },
);

committeeEngagementSchema.index(
  { buildingId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: CommitteeEngagementStatus.PROPOSED_TERMS,
      signedAt: null,
    },
  },
);

export type CommitteeEngagementDocument = InferSchemaType<typeof committeeEngagementSchema> & {
  _id: mongoose.Types.ObjectId;
};

export type CommitteeEngagementModel = Model<CommitteeEngagementDocument>;

export const CommitteeEngagement: CommitteeEngagementModel =
  (mongoose.models.CommitteeEngagement as CommitteeEngagementModel | undefined) ??
  mongoose.model<CommitteeEngagementDocument>("CommitteeEngagement", committeeEngagementSchema);
