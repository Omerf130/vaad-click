import "server-only";

import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const lawyerAdminSetupTokenSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
    },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    collection: "lawyer_admin_setup_tokens",
  },
);

lawyerAdminSetupTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type LawyerAdminSetupTokenDocument = InferSchemaType<
  typeof lawyerAdminSetupTokenSchema
> & {
  _id: mongoose.Types.ObjectId;
};

export type LawyerAdminSetupTokenModel = Model<LawyerAdminSetupTokenDocument>;

export const LawyerAdminSetupToken: LawyerAdminSetupTokenModel =
  (mongoose.models.LawyerAdminSetupToken as LawyerAdminSetupTokenModel | undefined) ??
  mongoose.model<LawyerAdminSetupTokenDocument>(
    "LawyerAdminSetupToken",
    lawyerAdminSetupTokenSchema,
  );
