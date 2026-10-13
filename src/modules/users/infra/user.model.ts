import "server-only";

import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

import { AccountStatus } from "@/modules/users/domain/account-status";
import { MfaMethod } from "@/modules/users/domain/mfa-state";
import { UserRole } from "@/modules/users/domain/user-role";
import { normalizeEmail } from "@/shared/validation/email";

const userMfaSchema = new Schema(
  {
    method: {
      type: String,
      enum: [MfaMethod.TOTP, MfaMethod.SMS],
      default: undefined,
    },
    enrolledAt: { type: Date, default: null },
  },
  { _id: false },
);

const userSchema = new Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    email: {
      type: String,
      required: false,
      trim: true,
      lowercase: true,
      unique: true,
      sparse: true,
      set: (value: string | undefined | null) =>
        value ? normalizeEmail(value) : value,
    },
    phoneE164: {
      type: String,
      required: false,
      trim: true,
      unique: true,
      sparse: true,
    },
    passwordHash: {
      type: String,
      required: false,
      select: false,
    },
    role: {
      type: String,
      required: true,
      enum: Object.values(UserRole),
    },
    accountStatus: {
      type: String,
      required: true,
      enum: Object.values(AccountStatus),
      default: AccountStatus.ACTIVE,
    },
    emailVerifiedAt: { type: Date, default: null },
    mfa: { type: userMfaSchema, default: () => ({}) },
  },
  {
    timestamps: true,
    collection: "users",
  },
);

userSchema.index({ role: 1, accountStatus: 1 });

export type UserDocument = InferSchemaType<typeof userSchema> & {
  _id: mongoose.Types.ObjectId;
};

export type UserModel = Model<UserDocument>;

export const User: UserModel =
  (mongoose.models.User as UserModel | undefined) ??
  mongoose.model<UserDocument>("User", userSchema);
