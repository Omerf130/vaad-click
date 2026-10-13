import "server-only";

import type { ClientSession } from "mongoose";
import { Types } from "mongoose";

import { computeSessionExpiresAt } from "@/modules/auth/domain/session-lifecycle";
import {
  SessionAuthStage,
  type SessionRecord,
} from "@/modules/auth/domain/session-types";
import { Session } from "@/modules/auth/infra/session.model";
import { assertAuthDatabaseEnv } from "@/shared/config/env.server";
import { connectMongo } from "@/shared/db/connect";
import { createOpaqueSessionToken } from "@/shared/security/session-token";
import { hashSessionToken } from "@/shared/security/session-token.server";

export type CreateSessionResult = {
  token: string;
  session: SessionRecord;
};

export async function createServerSession(
  input: {
    userId: string;
    authStage: SessionAuthStage;
  },
  options?: { session?: ClientSession },
): Promise<CreateSessionResult> {
  assertAuthDatabaseEnv();
  await connectMongo();

  const token = createOpaqueSessionToken();
  const tokenHash = hashSessionToken(token);
  const expiresAt = computeSessionExpiresAt(input.authStage);

  const createOptions = options?.session ? { session: options.session } : undefined;
  const doc = (
    await Session.create(
      [
        {
          userId: new Types.ObjectId(input.userId),
          tokenHash,
          authStage: input.authStage,
          expiresAt,
          revokedAt: null,
        },
      ],
      createOptions,
    )
  )[0];

  if (!doc) {
    throw new Error("Failed to create session.");
  }

  return {
    token,
    session: {
      userId: doc.userId.toString(),
      authStage: doc.authStage as SessionAuthStage,
      expiresAt: doc.expiresAt,
      revokedAt: doc.revokedAt ?? null,
    },
  };
}

export async function findServerSessionByToken(
  token: string,
): Promise<SessionRecord | null> {
  assertAuthDatabaseEnv();
  await connectMongo();

  const tokenHash = hashSessionToken(token);
  const doc = await Session.findOne({
    tokenHash,
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  }).lean();

  if (!doc) {
    return null;
  }

  return {
    userId: doc.userId.toString(),
    authStage: doc.authStage as SessionAuthStage,
    expiresAt: doc.expiresAt,
    revokedAt: doc.revokedAt ?? null,
  };
}

export async function revokeServerSessionByToken(token: string): Promise<boolean> {
  assertAuthDatabaseEnv();
  await connectMongo();

  const tokenHash = hashSessionToken(token);
  const result = await Session.updateOne(
    { tokenHash, revokedAt: null },
    { $set: { revokedAt: new Date() } },
  );

  return result.modifiedCount > 0;
}

export async function revokeAllServerSessionsForUser(
  userId: string,
  options?: { session?: ClientSession },
): Promise<number> {
  assertAuthDatabaseEnv();
  await connectMongo();

  const result = await Session.updateMany(
    { userId: new Types.ObjectId(userId), revokedAt: null },
    { $set: { revokedAt: new Date() } },
    options?.session ? { session: options.session } : undefined,
  );

  return result.modifiedCount;
}
