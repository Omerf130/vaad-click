import "server-only";

import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

/**
 * One reserved calendar month for an apartment debt claim (submit-time only).
 * Unique per building + normalized apartment + month — independent of debtor identity.
 */
const debtCasePeriodClaimSchema = new Schema(
  {
    buildingId: { type: String, required: true, trim: true },
    apartmentKeyNormalized: { type: String, required: true, trim: true },
    periodMonth: { type: String, required: true, trim: true },
    debtCaseId: { type: String, required: true, trim: true, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: "debt_case_period_claims" },
);

debtCasePeriodClaimSchema.index(
  { buildingId: 1, apartmentKeyNormalized: 1, periodMonth: 1 },
  { unique: true },
);

export type DebtCasePeriodClaimDocument = InferSchemaType<typeof debtCasePeriodClaimSchema> & {
  _id: mongoose.Types.ObjectId;
};

export type DebtCasePeriodClaimModel = Model<DebtCasePeriodClaimDocument>;

export const DebtCasePeriodClaim: DebtCasePeriodClaimModel =
  (mongoose.models.DebtCasePeriodClaim as DebtCasePeriodClaimModel | undefined) ??
  mongoose.model<DebtCasePeriodClaimDocument>(
    "DebtCasePeriodClaim",
    debtCasePeriodClaimSchema,
  );
