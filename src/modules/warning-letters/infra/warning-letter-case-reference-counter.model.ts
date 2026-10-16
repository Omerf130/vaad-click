import "server-only";

import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

export function warningLetterCaseReferenceCounterId(year: number): string {
  return `warning_letter_case_ref_${year}`;
}

const warningLetterCaseReferenceCounterSchema = new Schema(
  {
    _id: { type: String, required: true },
    next: { type: Number, required: true, default: 0 },
  },
  {
    timestamps: false,
    collection: "warning_letter_case_reference_counters",
    strict: "throw",
  },
);

export type WarningLetterCaseReferenceCounterDocument = InferSchemaType<
  typeof warningLetterCaseReferenceCounterSchema
> & {
  _id: string;
};

export type WarningLetterCaseReferenceCounterModel =
  Model<WarningLetterCaseReferenceCounterDocument>;

export const WarningLetterCaseReferenceCounter: WarningLetterCaseReferenceCounterModel =
  (mongoose.models.WarningLetterCaseReferenceCounter as
    | WarningLetterCaseReferenceCounterModel
    | undefined) ??
  mongoose.model<WarningLetterCaseReferenceCounterDocument>(
    "WarningLetterCaseReferenceCounter",
    warningLetterCaseReferenceCounterSchema,
  );
