import "server-only";

import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

import { ManagementCompanyStatus } from "@/modules/management-companies/domain/management-company-status";

const managementCompanySchema = new Schema(
  {
    managementCompanyId: { type: String, required: true, unique: true, trim: true },
    displayName: { type: String, required: true, trim: true, maxlength: 200 },
    companyRegistrationNumber: { type: String, trim: true, maxlength: 32, default: null },
    contactEmail: { type: String, trim: true, lowercase: true, maxlength: 320, default: null },
    contactPhone: { type: String, trim: true, maxlength: 32, default: null },
    primaryUserId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    status: {
      type: String,
      enum: Object.values(ManagementCompanyStatus),
      default: ManagementCompanyStatus.ACTIVE,
    },
    archivedAt: { type: Date, default: null },
    createdByUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true, collection: "management_companies" },
);

managementCompanySchema.index(
  { primaryUserId: 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: { primaryUserId: { $type: "objectId" } },
  },
);

export type ManagementCompanyDocument = InferSchemaType<typeof managementCompanySchema> & {
  _id: mongoose.Types.ObjectId;
};

export type ManagementCompanyModel = Model<ManagementCompanyDocument>;

export const ManagementCompany: ManagementCompanyModel =
  (mongoose.models.ManagementCompany as ManagementCompanyModel | undefined) ??
  mongoose.model<ManagementCompanyDocument>("ManagementCompany", managementCompanySchema);
