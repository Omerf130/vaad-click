import "server-only";

import { MongoServerError } from "mongodb";

import { AccountStatus } from "@/modules/users/domain/account-status";
import { UserRole } from "@/modules/users/domain/user-role";
import { User } from "@/modules/users/infra/user.model";
import { connectMongo } from "@/shared/db/connect";
import { hashPassword } from "@/shared/security/password";
import { normalizeEmail } from "@/shared/validation/email";

export class LawyerAdminAlreadyExistsError extends Error {
  readonly code = "LAWYER_ADMIN_EXISTS";

  constructor() {
    super("A lawyer administrator account already exists.");
    this.name = "LawyerAdminAlreadyExistsError";
  }
}

export async function countLawyerAdministrators(): Promise<number> {
  await connectMongo();
  return User.countDocuments({ role: UserRole.LAWYER_ADMIN });
}

export async function createLawyerAdministrator(input: {
  fullName: string;
  email: string;
  password: string;
}): Promise<{ userId: string }> {
  await connectMongo();

  const existing = await countLawyerAdministrators();
  if (existing > 0) {
    throw new LawyerAdminAlreadyExistsError();
  }

  const passwordHash = await hashPassword(input.password);
  const email = normalizeEmail(input.email);

  try {
    const user = await User.create({
      fullName: input.fullName.trim(),
      email,
      passwordHash,
      role: UserRole.LAWYER_ADMIN,
      accountStatus: AccountStatus.ACTIVE,
      emailVerifiedAt: null,
    });

    return { userId: user._id.toString() };
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) {
      throw new LawyerAdminAlreadyExistsError();
    }
    throw error;
  }
}
