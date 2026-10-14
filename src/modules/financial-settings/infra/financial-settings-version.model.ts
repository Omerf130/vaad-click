import "server-only";

import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

import { AMOUNTS_MONETARY_BASES } from "@/modules/financial-settings/domain/amounts-monetary-basis";
import { CollectionAllocationOrder } from "@/modules/financial-settings/domain/collection-allocation-order";
import { CourtCostsPolicy } from "@/modules/financial-settings/domain/court-costs-policy";
import { EscalationCalculationBase } from "@/modules/financial-settings/domain/escalation-calculation-base";
import { SuccessFeeExclusion } from "@/modules/financial-settings/domain/success-fee-exclusion";
import { FinancialSettingsVersionStatus } from "@/modules/financial-settings/domain/financial-settings-version-status";
import { installFinancialSettingsVersionImmutabilityGuards } from "@/modules/financial-settings/infra/financial-settings-version-immutability";
import { CurrencyCode } from "@/shared/financial/currency";

const moneyAmountSchema = new Schema(
  {
    currency: { type: String, required: true, enum: Object.values(CurrencyCode) },
    amountMinor: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const vatScheduleEntrySchema = new Schema(
  {
    effectiveFrom: { type: Date, required: true },
    rateBasisPoints: { type: Number, required: true, min: 0, max: 10_000 },
  },
  { _id: false },
);

const amountsSchema = new Schema(
  {
    debtorTreatmentFeeExVat: { type: moneyAmountSchema, required: false },
    committeeTreatmentFeeWhenDebtorWaivedExVat: { type: moneyAmountSchema, required: false },
    debtorTreatmentFeeGross: { type: moneyAmountSchema, required: false },
    debtorTreatmentFeeNet: { type: moneyAmountSchema, required: false },
    debtorTreatmentFeeVat: { type: moneyAmountSchema, required: false },
    committeeTreatmentFeeWhenDebtorWaivedGross: { type: moneyAmountSchema, required: false },
    committeeTreatmentFeeWhenDebtorWaivedNet: { type: moneyAmountSchema, required: false },
    committeeTreatmentFeeWhenDebtorWaivedVat: { type: moneyAmountSchema, required: false },
  },
  { _id: false },
);

const escalationSchema = new Schema(
  {
    recoveryFeeRateBasisPoints: { type: Number, required: false, min: 0, max: 10_000 },
    calculationBase: {
      type: String,
      required: false,
      enum: Object.values(EscalationCalculationBase),
    },
    courtCostsPolicy: {
      type: String,
      required: false,
      enum: Object.values(CourtCostsPolicy),
    },
    successFeeExclusions: {
      type: [String],
      required: false,
      enum: Object.values(SuccessFeeExclusion),
      default: undefined,
    },
    collectionAllocationOrder: {
      type: String,
      required: false,
      enum: Object.values(CollectionAllocationOrder),
    },
  },
  { _id: false },
);

const platformFeesSchema = new Schema(
  {
    trustAccountProcessingFeeBasisPoints: { type: Number, required: false, min: 0, max: 10_000 },
    committeeTransferFeeBasisPoints: { type: Number, required: false, min: 0, max: 10_000 },
  },
  { _id: false },
);

const provenanceSchema = new Schema(
  {
    clonedFromSettingsVersionId: { type: String, required: false, maxlength: 64 },
  },
  { _id: false },
);

const financialSettingsVersionSchema = new Schema(
  {
    settingsVersionId: { type: String, required: true, unique: true, index: true },
    versionNumber: { type: Number, required: false, default: null },
    status: {
      type: String,
      required: true,
      enum: Object.values(FinancialSettingsVersionStatus),
      index: true,
    },
    effectiveFrom: { type: Date, required: false, default: null },
    publishedAt: { type: Date, required: false, default: null },
    publishedByUserId: { type: Schema.Types.ObjectId, ref: "User", required: false },
    createdByUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    revision: { type: Number, required: true, default: 1 },
    currency: { type: String, required: true, enum: Object.values(CurrencyCode) },
    amountsMonetaryBasis: {
      type: String,
      required: false,
      enum: AMOUNTS_MONETARY_BASES,
    },
    amounts: { type: amountsSchema, required: true, default: () => ({}) },
    vatSchedule: { type: [vatScheduleEntrySchema], required: true, default: () => [] },
    escalation: { type: escalationSchema, required: true, default: () => ({}) },
    platformFees: { type: platformFeesSchema, required: false, default: undefined },
    notesInternal: { type: String, required: false, maxlength: 2000 },
    provenance: { type: provenanceSchema, required: false },
  },
  {
    timestamps: true,
    collection: "financial_settings_versions",
    strict: "throw",
  },
);

installFinancialSettingsVersionImmutabilityGuards(financialSettingsVersionSchema);

financialSettingsVersionSchema.index(
  { status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: FinancialSettingsVersionStatus.DRAFT },
  },
);

financialSettingsVersionSchema.index(
  { effectiveFrom: 1 },
  {
    unique: true,
    partialFilterExpression: { status: FinancialSettingsVersionStatus.PUBLISHED },
  },
);

financialSettingsVersionSchema.index(
  { versionNumber: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: FinancialSettingsVersionStatus.PUBLISHED,
      versionNumber: { $type: "number" },
    },
  },
);

financialSettingsVersionSchema.index({ status: 1, effectiveFrom: -1 });

export type FinancialSettingsVersionDocument = InferSchemaType<
  typeof financialSettingsVersionSchema
> & {
  _id: mongoose.Types.ObjectId;
};

export type FinancialSettingsVersionModel = Model<FinancialSettingsVersionDocument>;

export const FinancialSettingsVersion: FinancialSettingsVersionModel =
  (mongoose.models.FinancialSettingsVersion as FinancialSettingsVersionModel | undefined) ??
  mongoose.model<FinancialSettingsVersionDocument>(
    "FinancialSettingsVersion",
    financialSettingsVersionSchema,
  );
