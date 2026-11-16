import "server-only";

import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

import { DebtCaseDebtorResponseType } from "@/modules/debt-cases/domain/debt-case-debtor-response-type";

const debtCaseDebtorResponseSchema = new Schema(
  {
    debtorResponseId: { type: String, required: true, unique: true, index: true },
    debtCaseId: { type: String, required: true, index: true },
    buildingId: { type: String, required: true, index: true },
    responseType: {
      type: String,
      enum: Object.values(DebtCaseDebtorResponseType),
      required: true,
    },
    responseDate: { type: Date, required: true },
    recordedAt: { type: Date, required: true },
    recordedByUserId: { type: Schema.Types.ObjectId, required: true },
    lawyerNotes: { type: String, default: null },
    idempotencyKey: { type: String, default: null },
  },
  {
    timestamps: true,
    collection: "debt_case_debtor_responses",
    strict: "throw",
  },
);

debtCaseDebtorResponseSchema.index(
  { debtCaseId: 1, idempotencyKey: 1 },
  {
    unique: true,
    partialFilterExpression: { idempotencyKey: { $type: "string" } },
    name: "unique_debtor_response_idempotency_per_case",
  },
);

export type DebtCaseDebtorResponseDocument = InferSchemaType<typeof debtCaseDebtorResponseSchema>;

export const DebtCaseDebtorResponse: Model<DebtCaseDebtorResponseDocument> =
  mongoose.models.DebtCaseDebtorResponse ??
  mongoose.model("DebtCaseDebtorResponse", debtCaseDebtorResponseSchema);