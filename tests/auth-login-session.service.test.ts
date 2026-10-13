import { beforeEach, describe, expect, it, vi } from "vitest";

import { SessionAuthStage } from "@/modules/auth/domain/session-types";
import { UserRole } from "@/modules/users/domain/user-role";

const mockWithTransaction = vi.fn(async (fn: () => Promise<void>) => fn());
const mockEndSession = vi.fn();
const mockStartSession = vi.fn(() => ({
  withTransaction: mockWithTransaction,
  endSession: mockEndSession,
}));

vi.mock("mongoose", () => ({
  default: {
    startSession: () => mockStartSession(),
  },
}));

vi.mock("@/shared/db/connect", () => ({
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/modules/auth/services/session.service", () => ({
  revokeAllServerSessionsForUser: vi.fn().mockResolvedValue(1),
  createServerSession: vi.fn().mockResolvedValue({
    token: "opaque-token",
    session: {},
  }),
}));

vi.mock("@/modules/audit/services/auth-audit.service", () => ({
  recordAuthLoginSuccess: vi.fn().mockResolvedValue(undefined),
}));

describe("establishLoginSessionWithMandatoryAudit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("runs session revocation, creation, and audit in a transaction", async () => {
    const { establishLoginSessionWithMandatoryAudit } = await import(
      "@/modules/auth/services/auth-login-session.service"
    );
    const { revokeAllServerSessionsForUser, createServerSession } = await import(
      "@/modules/auth/services/session.service"
    );
    const { recordAuthLoginSuccess } = await import(
      "@/modules/audit/services/auth-audit.service"
    );

    const result = await establishLoginSessionWithMandatoryAudit({
      userId: "user-1",
      role: UserRole.BUILDING_REP,
      authStage: SessionAuthStage.MFA_COMPLETE,
    });

    expect(mockWithTransaction).toHaveBeenCalled();
    expect(revokeAllServerSessionsForUser).toHaveBeenCalled();
    expect(createServerSession).toHaveBeenCalled();
    expect(recordAuthLoginSuccess).toHaveBeenCalled();
    expect(result.token).toBe("opaque-token");
  });
});
