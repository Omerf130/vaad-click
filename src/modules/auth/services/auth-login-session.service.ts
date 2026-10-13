import "server-only";

import mongoose from "mongoose";

import { SessionAuthStage } from "@/modules/auth/domain/session-types";
import { recordAuthLoginSuccess } from "@/modules/audit/services/auth-audit.service";
import {
  createServerSession,
  revokeAllServerSessionsForUser,
  type CreateSessionResult,
} from "@/modules/auth/services/session.service";
import type { UserRole } from "@/modules/users/domain/user-role";
import { connectMongo } from "@/shared/db/connect";
import { AuditWriteFailedError } from "@/shared/audit/errors/audit-errors";

export class LoginSessionEstablishmentError extends Error {
  readonly code = "LOGIN_SESSION_ESTABLISHMENT_FAILED";

  constructor(cause?: unknown) {
    super("Unable to complete login.");
    this.name = "LoginSessionEstablishmentError";
    if (cause instanceof Error && cause.message) {
      this.cause = cause;
    }
  }
}

export async function establishLoginSessionWithMandatoryAudit(input: {
  userId: string;
  role: UserRole;
  authStage: SessionAuthStage;
  correlationId?: string;
}): Promise<CreateSessionResult> {
  await connectMongo();

  const mongoSession = await mongoose.startSession();
  let sessionResult: CreateSessionResult | null = null;

  try {
    await mongoSession.withTransaction(async () => {
      await revokeAllServerSessionsForUser(input.userId, { session: mongoSession });
      sessionResult = await createServerSession(
        { userId: input.userId, authStage: input.authStage },
        { session: mongoSession },
      );
      await recordAuthLoginSuccess({
        userId: input.userId,
        role: input.role,
        authStage: input.authStage,
        correlationId: input.correlationId,
        session: mongoSession,
      });
    });
  } catch (error) {
    if (error instanceof AuditWriteFailedError) {
      throw new LoginSessionEstablishmentError(error);
    }
    throw new LoginSessionEstablishmentError(error);
  } finally {
    await mongoSession.endSession();
  }

  if (!sessionResult) {
    throw new LoginSessionEstablishmentError();
  }

  return sessionResult;
}
