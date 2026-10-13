import {
  SessionAuthStage,
  sessionTtlSecondsForStage,
  type SessionRecord,
} from "@/modules/auth/domain/session-types";

export function computeSessionExpiresAt(
  stage: SessionAuthStage,
  now: Date = new Date(),
): Date {
  const ttlSeconds = sessionTtlSecondsForStage(stage);
  return new Date(now.getTime() + ttlSeconds * 1000);
}

export function isSessionActive(session: SessionRecord, now: Date = new Date()): boolean {
  if (session.revokedAt) {
    return false;
  }
  return session.expiresAt.getTime() > now.getTime();
}

export function revokeSessionRecord(
  session: SessionRecord,
  revokedAt: Date = new Date(),
): SessionRecord {
  return { ...session, revokedAt };
}
