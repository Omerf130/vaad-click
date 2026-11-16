import "server-only";

import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

import { DebtCaseManualPaymentEntryType } from "@/modules/debt-cases/domain/debt-case-manual-payment-entry-type";
import { DebtCaseManualPaymentMethod } from "@/modules/debt-cases/domain/debt-case-manual-payment-method";

const debtCaseManualPaymentSchema = new Schema(
  {
    paymentEntryId: { type: String, required: true, unique: true, index: true },
    debtCaseId: { type: String, required: true, index: true },
    buildingId: { type: String, required: true, index: true },
    entryType: {
      type: String,
      enum: Object.values(DebtCaseManualPaymentEntryType),
      required: true,
    },
    amountMinor: { type: Number, required: true, min: 1 },
    signedEffectMinor: { type: Number, required: true },
    paymentDate: { type: Date, required: true },
    recordedAt: { type: Date, required: true },
    recordedByUserId: { type: Schema.Types.ObjectId, required: true },
    paymentMethod: {
      type: String,
      enum: [...Object.values(DebtCaseManualPaymentMethod), null],
      default: null,
    },
    reference: { type: String, default: null },
    lawyerNotes: { type: String, default: null },
    evidenceDocumentAssetId: { type: String, default: null },
    idempotencyKey: { type: String, default: null },
    reversesPaymentEntryId: { type: String, default: null },
    correctionReasonHe: { type: String, default: null },
    acceptOverpaymentAcknowledged: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    collection: "debt_case_manual_payments",
    strict: "throw",
  },
);

debtCaseManualPaymentSchema.index(
  { debtCaseId: 1, idempotencyKey: 1 },
  {
    unique: true,
    partialFilterExpression: { idempotencyKey: { $type: "string" } },
    name: "unique_manual_payment_idempotency_per_case",
  },
);

export type DebtCaseManualPaymentDocument = InferSchemaType<typeof debtCaseManualPaymentSchema>;

export const DebtCaseManualPayment: Model<DebtCaseManualPaymentDocument> =
  mongoose.models.DebtCaseManualPayment ??
  mongoose.model("DebtCaseManualPayment", debtCaseManualPaymentSchema);