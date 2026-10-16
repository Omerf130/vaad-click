import "server-only";

import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

import {
  BuildingOrganizationalStatus,
  LawyerVerificationStatus,
} from "@/modules/buildings/domain/building-status";

const buildingAddressSchema = new Schema(
  {
    city: { type: String, required: true, trim: true, maxlength: 120 },
    street: { type: String, required: true, trim: true, maxlength: 200 },
    houseNumber: { type: String, required: true, trim: true, maxlength: 32 },
    postalCode: { type: String, trim: true, maxlength: 16, default: null },
  },
  { _id: false },
);

const duplicateExceptionSchema = new Schema(
  {
    acknowledgedAt: { type: Date, required: true },
    acknowledgedByUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    reasonInternal: { type: String, required: true, maxlength: 500 },
  },
  { _id: false },
);

const buildingSchema = new Schema(
  {
    buildingId: { type: String, required: true, unique: true, trim: true },
    displayName: { type: String, required: true, trim: true, maxlength: 200 },
    address: { type: buildingAddressSchema, required: true },
    normalizedAddressKey: { type: String, required: true, trim: true, index: true },
    designatedRepresentativeUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    managementCompanyId: {
      type: Schema.Types.ObjectId,
      ref: "ManagementCompany",
      default: null,
    },
    organizationalStatus: {
      type: String,
      enum: Object.values(BuildingOrganizationalStatus),
      default: BuildingOrganizationalStatus.ACTIVE,
    },
    lawyerVerificationStatus: {
      type: String,
      enum: Object.values(LawyerVerificationStatus),
      default: LawyerVerificationStatus.NOT_STARTED,
    },
    duplicateException: { type: duplicateExceptionSchema, default: null },
    unitCount: { type: Number, min: 0, default: null },
    averageMonthlyVaadFeeMinor: { type: Number, min: 0, default: null },
    /** Lawyer-admin only; enables streamlined review tier when legal readiness passes (CP8.1A). */
    legacyFastTrackEligible: { type: Boolean, default: false },
    /** Lawyer-marked: building has basis to charge debtor treatment fee on warning letter (CP8.4B). */
    treatmentFeeEligible: { type: Boolean, default: false },
    createdByUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    archivedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: "buildings" },
);

buildingSchema.index(
  { designatedRepresentativeUserId: 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: { designatedRepresentativeUserId: { $type: "objectId" } },
  },
);

buildingSchema.index(
  { normalizedAddressKey: 1 },
  {
    unique: true,
    partialFilterExpression: {
      organizationalStatus: BuildingOrganizationalStatus.ACTIVE,
      duplicateException: null,
    },
  },
);

buildingSchema.index({ managementCompanyId: 1, organizationalStatus: 1 });

export type BuildingDocument = InferSchemaType<typeof buildingSchema> & {
  _id: mongoose.Types.ObjectId;
};

export type BuildingModel = Model<BuildingDocument>;

export const Building: BuildingModel =
  (mongoose.models.Building as BuildingModel | undefined) ??
  mongoose.model<BuildingDocument>("Building", buildingSchema);
