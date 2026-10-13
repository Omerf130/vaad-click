import "server-only";

import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

import { SessionAuthStage } from "@/modules/auth/domain/session-types";

const sessionSchema = new Schema(
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
    authStage: {
      type: String,
      required: true,
      enum: Object.values(SessionAuthStage),
    },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    collection: "sessions",
  },
);

sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type SessionDocument = InferSchemaType<typeof sessionSchema> & {
  _id: mongoose.Types.ObjectId;
};

export type SessionDbModel = Model<SessionDocument>;

export const Session: SessionDbModel =
  (mongoose.models.Session as SessionDbModel | undefined) ??
  mongoose.model<SessionDocument>("Session", sessionSchema);
