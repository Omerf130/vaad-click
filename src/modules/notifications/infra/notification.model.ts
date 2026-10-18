import "server-only";

import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const notificationSchema = new Schema(
  {
    notificationId: { type: String, required: true, unique: true, trim: true },
    recipientUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    eventType: { type: String, required: true, trim: true },
    titleHe: { type: String, required: true, trim: true, maxlength: 200 },
    bodyHe: { type: String, required: true, trim: true, maxlength: 500 },
    entityType: { type: String, required: true, trim: true },
    entityId: { type: String, required: true, trim: true },
    buildingId: { type: String, trim: true, default: null },
    destinationPath: { type: String, required: true, trim: true, maxlength: 500 },
    idempotencyKey: { type: String, required: true, trim: true, maxlength: 240 },
    readAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: "notifications" },
);

notificationSchema.index({ recipientUserId: 1, idempotencyKey: 1 }, { unique: true });
notificationSchema.index({ recipientUserId: 1, readAt: 1, createdAt: -1 });

export type NotificationDocument = InferSchemaType<typeof notificationSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
};

export type NotificationModel = Model<NotificationDocument>;

export const Notification =
  (mongoose.models.Notification as NotificationModel | undefined) ??
  mongoose.model<NotificationDocument>("Notification", notificationSchema);
