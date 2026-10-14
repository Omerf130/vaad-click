import "server-only";

import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

export const PUBLISHED_VERSION_NUMBER_COUNTER_ID = "published_version_number";

const financialSettingsCounterSchema = new Schema(
  {
    _id: { type: String, required: true },
    next: { type: Number, required: true, default: 0 },
  },
  {
    timestamps: false,
    collection: "financial_settings_counters",
    strict: "throw",
  },
);

export type FinancialSettingsCounterDocument = InferSchemaType<
  typeof financialSettingsCounterSchema
> & {
  _id: string;
};

export type FinancialSettingsCounterModel = Model<FinancialSettingsCounterDocument>;

export const FinancialSettingsCounter: FinancialSettingsCounterModel =
  (mongoose.models.FinancialSettingsCounter as FinancialSettingsCounterModel | undefined) ??
  mongoose.model<FinancialSettingsCounterDocument>(
    "FinancialSettingsCounter",
    financialSettingsCounterSchema,
  );
