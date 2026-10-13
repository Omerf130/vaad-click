import "server-only";

import { Types } from "mongoose";

import {
  computeSetupTokenExpiresAt,
  isSetupTokenActive,
} from "@/modules/auth/domain/lawyer-admin-setup-token-lifecycle";
import { LawyerAdminSetupToken } from "@/modules/auth/infra/lawyer-admin-setup-token.model";
import { UserRole } from "@/modules/users/domain/user-role";
import { User } from "@/modules/users/infra/user.model";
import { recordAuthAccountPasswordInitialized } from "@/modules/audit/services/auth-audit.service";
import { findLawyerAdminPendingPasswordSetup } from "@/modules/users/services/bootstrap-initial-lawyer-admin";
import { connectMongo } from "@/shared/db/connect";
import { hashPassword } from "@/shared/security/password";
import { getAuthSecret } from "@/shared/config/env.server";
import {
  createOpaqueSessionToken,
  hashSessionTokenWithSecret,
} from "@/shared/security/session-token";

function hashSetupToken(rawToken: string): string {
  return hashSessionTokenWithSecret(rawToken, getAuthSecret());
}

export type IssueSetupTokenResult = {
  rawToken: string;
  expiresAt: Date;
  userId: string;
};

/** Creates a single-use setup token for the pending initial lawyer admin. */
export async function issueLawyerAdminSetupToken(): Promise<IssueSetupTokenResult> {
  await connectMongo();

  const pending = await findLawyerAdminPendingPasswordSetup();
  if (!pending) {
    throw new Error("No lawyer administrator is pending password setup.");
  }

  await LawyerAdminSetupToken.deleteMany({
    userId: new Types.ObjectId(pending.id),
    usedAt: null,
  });

  const rawToken = createOpaqueSessionToken();
  const tokenHash = hashSetupToken(rawToken);
  const expiresAt = computeSetupTokenExpiresAt();

  await LawyerAdminSetupToken.create({
    userId: new Types.ObjectId(pending.id),
    tokenHash,
    expiresAt,
    usedAt: null,
  });

  return { rawToken, expiresAt, userId: pending.id };
}

export async function validateLawyerAdminSetupToken(rawToken: string): Promise<{
  userId: string;
  fullName: string;
  email: string;
} | null> {
  await connectMongo();

  const tokenHash = hashSetupToken(rawToken.trim());
  const tokenDoc = await LawyerAdminSetupToken.findOne({ tokenHash }).lean();
  if (
    !tokenDoc ||
    !isSetupTokenActive({
      userId: tokenDoc.userId.toString(),
      expiresAt: tokenDoc.expiresAt,
      usedAt: tokenDoc.usedAt ?? null,
    })
  ) {
    return null;
  }

  const user = await User.findOne({
    _id: tokenDoc.userId,
    role: UserRole.LAWYER_ADMIN,
  })
    .select("+passwordHash fullName email")
    .lean();

  if (!user?.email || user.passwordHash) {
    return null;
  }

  return {
    userId: user._id.toString(),
    fullName: user.fullName,
    email: user.email,
  };
}

export type CompleteSetupResult =
  | { ok: true }
  | { ok: false; code: "INVALID_TOKEN" | "ALREADY_COMPLETED" | "CONFLICT" };

/**
 * Atomically consumes the setup token and sets the password (replay-safe).
 */
export async function completeLawyerAdminSetupWithToken(input: {
  rawToken: string;
  password: string;
}): Promise<CompleteSetupResult> {
  await connectMongo();

  const rawToken = input.rawToken.trim();
  if (!rawToken) {
    return { ok: false, code: "INVALID_TOKEN" };
  }

  const tokenHash = hashSetupToken(rawToken);
  const now = new Date();
  const passwordHash = await hashPassword(input.password);

  const session = await LawyerAdminSetupToken.db.startSession();
  try {
    let completed = false;

    await session.withTransaction(async () => {
      const tokenDoc = await LawyerAdminSetupToken.findOneAndUpdate(
        {
          tokenHash,
          usedAt: null,
          expiresAt: { $gt: now },
        },
        { $set: { usedAt: now } },
        { new: true, session },
      );

      if (!tokenDoc) {
        return;
      }

      const userUpdate = await User.updateOne(
        {
          _id: tokenDoc.userId,
          role: UserRole.LAWYER_ADMIN,
          $or: [{ passwordHash: { $exists: false } }, { passwordHash: null }],
        },
        { $set: { passwordHash } },
        { session },
      );

      if (userUpdate.modifiedCount !== 1) {
        throw new Error("SETUP_PASSWORD_CONFLICT");
      }

      await recordAuthAccountPasswordInitialized({
        userId: tokenDoc.userId.toString(),
        role: UserRole.LAWYER_ADMIN,
        session,
      });

      completed = true;
    });

    if (!completed) {
      const stillPending = await findLawyerAdminPendingPasswordSetup();
      if (!stillPending) {
        return { ok: false, code: "ALREADY_COMPLETED" };
      }
      return { ok: false, code: "INVALID_TOKEN" };
    }

    return { ok: true };
  } catch (error) {
    if (error instanceof Error && error.message === "SETUP_PASSWORD_CONFLICT") {
      return { ok: false, code: "CONFLICT" };
    }
    throw error;
  } finally {
    await session.endSession();
  }
}
