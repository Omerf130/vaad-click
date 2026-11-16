import "server-only";

import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

import { WarningLetterDeliveryChannel } from "@/modules/warning-letters/domain/warning-letter-delivery-channel";
import { WarningLetterDeliveryRecordStatus } from "@/modules/warning-letters/domain/warning-letter-delivery-record-status";

const warningLetterDeliveryRecordSchema = new Schema(
  {
    deliveryRecordId: { type: String, required: true, unique: true, index: true },
    debtCaseId: { type: String, required: true, index: true },
    finalDocumentId: { type: String, required: true, index: true },
    channel: {
      type: String,
      enum: Object.values(WarningLetterDeliveryChannel),
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(WarningLetterDeliveryRecordStatus),
      required: true,
    },
    recipientDisplayName: { type: String, required: true },
    recipientContactHint: { type: String, default: null },
    authorizedByUserId: { type: Schema.Types.ObjectId, required: true },
    authorizedAt: { type: Date, required: true },
    sentAt: { type: Date, default: null },
    confirmedDeliveredAt: { type: Date, default: null },
    internalNotes: { type: String, default: null },
    evidenceDocumentAssetId: { type: String, default: null },
    idempotencyKey: { type: String, default: null, index: true },
    attemptRecordedAt: { type: Date, default: null },
    trackingReference: { type: String, default: null },
    evidenceNote: { type: String, default: null },
    evidenceRecordedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    failureNote: { type: String, default: null },
  },
  {
    timestamps: true,
    collection: "warning_letter_delivery_records",
    strict: "throw",
  },
);

warningLetterDeliveryRecordSchema.index(
  { debtCaseId: 1, idempotencyKey: 1 },
  {
    unique: true,
    partialFilterExpression: { idempotencyKey: { $type: "string" } },
    name: "unique_delivery_idempotency_per_case",
  },
);

export type WarningLetterDeliveryRecordDocument = InferSchemaType<
  typeof warningLetterDeliveryRecordSchema
>;

export const WarningLetterDeliveryRecord: Model<WarningLetterDeliveryRecordDocument> =
  mongoose.models.WarningLetterDeliveryRecord ??
  mongoose.model("WarningLetterDeliveryRecord", warningLetterDeliveryRecordSchema);
