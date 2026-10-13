import "server-only";

import { MongoServerError } from "mongodb";

import { AccountStatus } from "@/modules/users/domain/account-status";
import { UserRole } from "@/modules/users/domain/user-role";
import { User } from "@/modules/users/infra/user.model";
import { LawyerAdminAlreadyExistsError } from "@/modules/users/services/lawyer-admin-provision";
import { connectMongo } from "@/shared/db/connect";
import { normalizeEmail } from "@/shared/validation/email";

export type BootstrapInitialLawyerAdminResult = {
  userId: string;
  email: string;
  fullName: string;
  passwordSetupRequired: true;
};

/** Creates the first lawyer admin without a password — password set via dev-only setup UI. */
export async function bootstrapInitialLawyerAdmin(input: {
  fullName: string;
  email: string;
}): Promise<BootstrapInitialLawyerAdminResult> {
  await connectMongo();

  const existingAdmins = await User.countDocuments({ role: UserRole.LAWYER_ADMIN });
  if (existingAdmins > 0) {
    throw new LawyerAdminAlreadyExistsError();
  }

  const email = normalizeEmail(input.email);
  const fullName = input.fullName.trim();

  try {
    const user = await User.create({
      fullName,
      email,
      role: UserRole.LAWYER_ADMIN,
      accountStatus: AccountStatus.ACTIVE,
      emailVerifiedAt: null,
      mfa: { enrolledAt: null },
    });

    return {
      userId: user._id.toString(),
      email,
      fullName,
      passwordSetupRequired: true,
    };
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) {
      throw new LawyerAdminAlreadyExistsError();
    }
    throw error;
  }
}

export async function findLawyerAdminPendingPasswordSetup(): Promise<{
  id: string;
  fullName: string;
  email: string;
} | null> {
  await connectMongo();

  const admins = await User.find({ role: UserRole.LAWYER_ADMIN })
    .select("+passwordHash fullName email")
    .lean();

  if (admins.length !== 1) {
    return null;
  }

  const admin = admins[0];
  if (!admin?.email || admin.passwordHash) {
    return null;
  }

  return {
    id: admin._id.toString(),
    fullName: admin.fullName,
    email: admin.email,
  };
}

export async function setInitialLawyerAdminPassword(input: {
  userId: string;
  password: string;
}): Promise<void> {
  await connectMongo();

  const user = await User.findOne({
    _id: input.userId,
    role: UserRole.LAWYER_ADMIN,
  }).select("+passwordHash");

  if (!user || user.passwordHash) {
    throw new Error("Password setup is not available for this account.");
  }

  const { hashPassword } = await import("@/shared/security/password");
  user.passwordHash = await hashPassword(input.password);
  await user.save();
}
