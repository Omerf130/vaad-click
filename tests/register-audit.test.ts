import { beforeEach, describe, expect, it, vi } from "vitest";

import { UserRole } from "@/modules/users/domain/user-role";

const mockWithTransaction = vi.fn(async (fn: () => Promise<void>) => fn());
const mockEndSession = vi.fn();

vi.mock("mongoose", () => ({
  default: {
    startSession: () => ({
      withTransaction: mockWithTransaction,
      endSession: mockEndSession,
    }),
  },
}));

const mockUserCreate = vi.fn();
vi.mock("@/modules/users/infra/user.model", () => ({
  User: {
    create: (...args: unknown[]) => mockUserCreate(...args),
  },
}));

vi.mock("@/shared/security/password", () => ({
  hashPassword: vi.fn().mockResolvedValue("hashed"),
}));

vi.mock("@/modules/auth/services/session.service", () => ({
  createServerSession: vi.fn().mockResolvedValue({ token: "session-token", session: {} }),
}));

const mockRecordRegistration = vi.fn();
vi.mock("@/modules/audit/services/auth-audit.service", () => ({
  recordAuthRegistrationSuccess: (...args: unknown[]) => mockRecordRegistration(...args),
}));

vi.mock("@/shared/db/connect", () => ({
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/modules/debt-cases/services/pending-building-onboarding.service", () => ({
  createPendingBuildingOnboardingRequest: vi.fn().mockResolvedValue({ onboardingRequestId: "onb-1" }),
}));

vi.mock("@/modules/notifications/services/notification-dispatch.service", () => ({
  notifyLawyerAdminsAccountRegistrationPending: vi.fn().mockResolvedValue(undefined),
}));

describe("registerPublicUser audit transaction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserCreate.mockResolvedValue([{ _id: { toString: () => "new-user-id" } }]);
    mockRecordRegistration.mockResolvedValue(undefined);
  });

  it("fails registration when mandatory audit write throws", async () => {
    const { AuditWriteFailedError } = await import("@/shared/audit/errors/audit-errors");
    mockRecordRegistration.mockRejectedValue(new AuditWriteFailedError());

    const { registerPublicUser } = await import("@/modules/auth/services/register.service");
    const result = await registerPublicUser({
      fullName: "Test User",
      email: "user@example.com",
      password: "valid-password-12",
      role: UserRole.BUILDING_REP,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("AUDIT_PERSISTENCE");
    }
  });
});
