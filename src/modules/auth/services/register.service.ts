import "server-only";

import mongoose from "mongoose";
import { MongoServerError } from "mongodb";

import { SessionAuthStage } from "@/modules/auth/domain/session-types";
import type { RegisterInput } from "@/modules/auth/validation/register.schema";
import {
  recordAuthRegistrationSuccess,
} from "@/modules/audit/services/auth-audit.service";
import { createServerSession } from "@/modules/auth/services/session.service";
import { AccountStatus } from "@/modules/users/domain/account-status";
import { assertPublicRegistrationRole } from "@/modules/users/domain/role-assignment";
import { User } from "@/modules/users/infra/user.model";
import { createPendingBuildingOnboardingRequest } from "@/modules/debt-cases/services/pending-building-onboarding.service";
import { notifyLawyerAdminsAccountRegistrationPending } from "@/modules/notifications/services/notification-dispatch.service";
import { connectMongo } from "@/shared/db/connect";
import { AuditWriteFailedError } from "@/shared/audit/errors/audit-errors";
import { hashPassword } from "@/shared/security/password";

export type RegisterResult =
  | {
      ok: true;
      userId: string;
      sessionToken: string;
    }
  | {
      ok: false;
      code: "DUPLICATE_EMAIL" | "VALIDATION" | "ROLE_FORBIDDEN" | "AUDIT_PERSISTENCE";
      message: string;
    };

export class RegistrationPersistenceError extends Error {
  readonly code = "REGISTRATION_PERSISTENCE_FAILED";

  constructor(cause?: unknown) {
    super("Registration could not be completed.");
    this.name = "RegistrationPersistenceError";
    if (cause instanceof Error) {
      this.cause = cause;
    }
  }
}

export async function registerPublicUser(
  input: RegisterInput,
  options?: { correlationId?: string },
): Promise<RegisterResult> {
  try {
    assertPublicRegistrationRole(input.role);
  } catch {
    return {
      ok: false,
      code: "ROLE_FORBIDDEN",
      message: "לא ניתן ליצור חשבון מסוג זה בהרשמה עצמית.",
    };
  }

  await connectMongo();
  const passwordHash = await hashPassword(input.password);
  const mongoSession = await mongoose.startSession();

  let userId = "";
  let sessionToken = "";

  try {
    await mongoSession.withTransaction(async () => {
      let user;
      try {
        [user] = await User.create(
          [
            {
              fullName: input.fullName,
              email: input.email,
              passwordHash,
              role: input.role,
              accountStatus: AccountStatus.PENDING_APPROVAL,
              emailVerifiedAt: null,
            },
          ],
          { session: mongoSession },
        );
      } catch (error) {
        if (error instanceof MongoServerError && error.code === 11000) {
          throw error;
        }
        throw error;
      }

      if (!user) {
        throw new RegistrationPersistenceError();
      }

      userId = user._id.toString();

      await createPendingBuildingOnboardingRequest({
        targetUserId: userId,
        createdByUserId: userId,
        session: mongoSession,
      });

      await recordAuthRegistrationSuccess({
        userId,
        role: input.role,
        correlationId: options?.correlationId,
        session: mongoSession,
      });

      await notifyLawyerAdminsAccountRegistrationPending({
        registeredUserId: userId,
        registeredUserFullName: input.fullName,
        session: mongoSession,
      });

      const session = await createServerSession(
        {
          userId,
          authStage: SessionAuthStage.MFA_COMPLETE,
        },
        { session: mongoSession },
      );
      sessionToken = session.token;
    });
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) {
      return {
        ok: false,
        code: "DUPLICATE_EMAIL",
        message: "לא ניתן להשלים את ההרשמה. נסה להתחבר או להשתמש בדוא\"ל אחר.",
      };
    }
    if (error instanceof AuditWriteFailedError || error instanceof RegistrationPersistenceError) {
      return {
        ok: false,
        code: "AUDIT_PERSISTENCE",
        message: "לא ניתן להשלים את ההרשמה כעת. נסה שוב מאוחר יותר.",
      };
    }
    throw error;
  } finally {
    await mongoSession.endSession();
  }

  return { ok: true, userId, sessionToken };
}
