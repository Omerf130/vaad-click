import "server-only";

import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

import { DebtCaseDebtType } from "@/modules/debt-cases/domain/debt-case-debt-type";
import { DebtCaseIdentityDocumentType } from "@/modules/debt-cases/domain/debt-case-identity-document";
import { DebtCaseLawyerReviewStatus } from "@/modules/debt-cases/domain/debt-case-lawyer-review-status";
import { DebtCaseLegalHoldReason } from "@/modules/debt-cases/domain/debt-case-legal-hold-reason";
import { DebtCaseLetterDeliveryStatus } from "@/modules/debt-cases/domain/debt-case-letter-delivery-status";
import { DebtCaseOccupancyType } from "@/modules/debt-cases/domain/debt-case-occupancy-type";
import { LegalDebtorDesignation } from "@/modules/debt-cases/domain/debt-case-parties";
import { DebtCasePaymentStatus } from "@/modules/debt-cases/domain/debt-case-payment-status";
import {
  DebtCaseValidationFlagCode,
  DebtCaseValidationFlagSeverity,
} from "@/modules/debt-cases/domain/debt-case-validation-flag";
import { DebtCaseWorkflowStatus } from "@/modules/debt-cases/domain/debt-case-workflow-status";

const propertyOwnerPartySchema = new Schema(
  {
    fullName: { type: String, required: true, trim: true, maxlength: 300 },
    identityDocumentType: {
      type: String,
      enum: [...Object.values(DebtCaseIdentityDocumentType), null],
      default: null,
    },
    identityNumber: { type: String, trim: true, default: null },
    mobileE164: { type: String, trim: true, default: null },
    email: { type: String, trim: true, default: null },
  },
  { _id: false },
);

const tenantPartySchema = new Schema(
  {
    fullName: { type: String, required: true, trim: true, maxlength: 300 },
    identityDocumentType: {
      type: String,
      enum: [...Object.values(DebtCaseIdentityDocumentType), null],
      default: null,
    },
    identityNumber: { type: String, trim: true, default: null },
    mobileE164: { type: String, required: true, trim: true },
    email: { type: String, trim: true, default: null },
  },
  { _id: false },
);

const partiesSchema = new Schema(
  {
    propertyOwners: { type: [propertyOwnerPartySchema], required: true, default: [] },
    occupancyType: {
      type: String,
      enum: Object.values(DebtCaseOccupancyType),
      required: true,
    },
    legalDebtorDesignation: {
      type: String,
      enum: Object.values(LegalDebtorDesignation),
      required: true,
    },
    tenant: { type: tenantPartySchema, default: null },
    postalAddress: { type: String, trim: true, default: null },
  },
  { _id: false },
);

const validationFlagSchema = new Schema(
  {
    code: {
      type: String,
      enum: Object.values(DebtCaseValidationFlagCode),
      required: true,
    },
    severity: {
      type: String,
      enum: Object.values(DebtCaseValidationFlagSeverity),
      required: true,
    },
    messageHe: { type: String, required: true, maxlength: 500 },
  },
  { _id: false },
);

const letterSnapshotSchema = new Schema(
  {
    apartmentNumberDisplay: { type: String, required: true },
    apartmentKeyNormalized: { type: String, required: true },
    debtType: { type: String, enum: Object.values(DebtCaseDebtType), required: true },
    specialAssessmentDescription: { type: String, default: null },
    principalAmountMinor: { type: Number, required: true },
    periodStartMonth: { type: String, required: true },
    periodEndMonth: { type: String, required: true },
    parties: { type: partiesSchema, required: true },
  },
  { _id: false },
);

const debtCaseSchema = new Schema(
  {
    debtCaseId: { type: String, required: true, unique: true, trim: true },
    buildingId: { type: String, required: true, trim: true, index: true },
    pendingOnboardingRequestId: { type: String, trim: true, default: null },
    apartmentNumberDisplay: { type: String, trim: true, default: "" },
    apartmentKeyNormalized: { type: String, trim: true, default: "" },
    parties: { type: partiesSchema, default: null },
    debtType: {
      type: String,
      enum: Object.values(DebtCaseDebtType),
      default: null,
    },
    specialAssessmentDescription: { type: String, trim: true, default: null },
    principalAmountMinor: { type: Number, min: 0, default: null },
    periodStartMonth: { type: String, trim: true, default: null },
    periodEndMonth: { type: String, trim: true, default: null },
    workflowStatus: {
      type: String,
      enum: Object.values(DebtCaseWorkflowStatus),
      default: DebtCaseWorkflowStatus.DRAFT,
    },
    lawyerReviewStatus: {
      type: String,
      enum: Object.values(DebtCaseLawyerReviewStatus),
      default: DebtCaseLawyerReviewStatus.NOT_SUBMITTED,
    },
    letterDeliveryStatus: {
      type: String,
      enum: Object.values(DebtCaseLetterDeliveryStatus),
      default: DebtCaseLetterDeliveryStatus.NONE,
    },
    paymentStatus: {
      type: String,
      enum: Object.values(DebtCasePaymentStatus),
      default: DebtCasePaymentStatus.NONE,
    },
    legalHoldReasons: {
      type: [String],
      enum: Object.values(DebtCaseLegalHoldReason),
      default: [],
    },
    validationFlags: { type: [validationFlagSchema], default: [] },
    predecessorDebtCaseId: { type: String, trim: true, default: null },
    letterSentAt: { type: Date, default: null },
    debtSnapshotAtLetter: { type: letterSnapshotSchema, default: null },
    submittedAt: { type: Date, default: null },
    submittedByUserId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    createdByUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedByUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    revision: { type: Number, required: true, default: 0 },
  },
  { timestamps: true, collection: "debt_cases" },
);

debtCaseSchema.index({ buildingId: 1, workflowStatus: 1, updatedAt: -1 });
debtCaseSchema.index({ buildingId: 1, apartmentKeyNormalized: 1, workflowStatus: 1 });
debtCaseSchema.index(
  { lawyerReviewStatus: 1, submittedAt: 1 },
  {
    partialFilterExpression: {
      lawyerReviewStatus: DebtCaseLawyerReviewStatus.PENDING,
    },
  },
);
debtCaseSchema.index({ createdByUserId: 1, workflowStatus: 1, updatedAt: -1 });

export type DebtCaseDocument = InferSchemaType<typeof debtCaseSchema> & {
  _id: mongoose.Types.ObjectId;
};

export type DebtCaseModel = Model<DebtCaseDocument>;

export const DebtCase: DebtCaseModel =
  (mongoose.models.DebtCase as DebtCaseModel | undefined) ??
  mongoose.model<DebtCaseDocument>("DebtCase", debtCaseSchema);
