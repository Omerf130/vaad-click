import "server-only";

import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

import { WARNING_LETTER_OPERATIVE_DEADLINE_POLICY_ID } from "@/modules/warning-letters/domain/warning-letter-operative-deadline-policy";

const schema = new Schema(
  {
    confirmationId: { type: String, required: true, unique: true, index: true },
    policyId: {
      type: String,
      required: true,
      default: WARNING_LETTER_OPERATIVE_DEADLINE_POLICY_ID,
      index: true,
    },
    policySummaryHe: { type: String, required: true },
    confirmedByUserId: { type: Schema.Types.ObjectId, required: true },
    confirmedAt: { type: Date, required: true },
  },
  {
    timestamps: false,
    collection: "warning_letter_operative_deadline_policy_confirmations",
    strict: "throw",
  },
);

schema.index({ policyId: 1 }, { unique: true, name: "unique_active_operative_deadline_policy" });

export type WarningLetterOperativeDeadlinePolicyConfirmationDocument = InferSchemaType<typeof schema>;

export const WarningLetterOperativeDeadlinePolicyConfirmation: Model<WarningLetterOperativeDeadlinePolicyConfirmationDocument> =
  mongoose.models.WarningLetterOperativeDeadlinePolicyConfirmation ??
  mongoose.model("WarningLetterOperativeDeadlinePolicyConfirmation", schema);