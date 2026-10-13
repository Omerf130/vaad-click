import { describe, expect, it } from "vitest";

import {
  computeSessionExpiresAt,
  isSessionActive,
  revokeSessionRecord,
} from "@/modules/auth/domain/session-lifecycle";
import {
  SessionAuthStage,
  SESSION_TTL_MFA_COMPLETE_SECONDS,
  SESSION_TTL_PRIMARY_SECONDS,
} from "@/modules/auth/domain/session-types";

describe("session expiration", () => {
  it("uses shorter TTL for primary stage", () => {
    const now = new Date("2026-01-01T12:00:00.000Z");
    const expires = computeSessionExpiresAt(SessionAuthStage.PRIMARY, now);
    expect(expires.getTime() - now.getTime()).toBe(SESSION_TTL_PRIMARY_SECONDS * 1000);
  });

  it("uses longer TTL for MFA-complete stage", () => {
    const now = new Date("2026-01-01T12:00:00.000Z");
    const expires = computeSessionExpiresAt(SessionAuthStage.MFA_COMPLETE, now);
    expect(expires.getTime() - now.getTime()).toBe(
      SESSION_TTL_MFA_COMPLETE_SECONDS * 1000,
    );
  });

  it("treats expired sessions as inactive", () => {
    const now = new Date("2026-01-01T12:00:00.000Z");
    const session = {
      userId: "user-id",
      authStage: SessionAuthStage.MFA_COMPLETE,
      expiresAt: new Date("2026-01-01T11:00:00.000Z"),
      revokedAt: null,
    };
    expect(isSessionActive(session, now)).toBe(false);
  });
});

describe("session revocation", () => {
  it("marks session inactive after revocation", () => {
    const revokedAt = new Date("2026-01-01T12:00:00.000Z");
    const session = {
      userId: "user-id",
      authStage: SessionAuthStage.MFA_COMPLETE,
      expiresAt: new Date("2026-01-02T12:00:00.000Z"),
      revokedAt: null,
    };

    const revoked = revokeSessionRecord(session, revokedAt);
    expect(revoked.revokedAt).toEqual(revokedAt);
    expect(isSessionActive(revoked, revokedAt)).toBe(false);
  });
});
