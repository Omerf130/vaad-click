import { beforeEach, describe, expect, it, vi } from "vitest";

import { AccountStatus } from "@/modules/users/domain/account-status";
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

vi.mock("@/modules/audit/services/auth-audit.service", () => ({
  recordAuthRegistrationSuccess: vi.fn().mockResolvedValue(undefined),
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

describe("registerPublicUser account status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserCreate.mockResolvedValue([{ _id: { toString: () => "new-user-id" } }]);
  });

  it("creates building_rep and management_company users as pending_approval", async () => {
    const { registerPublicUser } = await import("@/modules/auth/services/register.service");

    for (const role of [UserRole.BUILDING_REP, UserRole.MANAGEMENT_COMPANY] as const) {
      mockUserCreate.mockClear();
      const result = await registerPublicUser({
        fullName: "Test User",
        email: `${role}@example.com`,
        password: "valid-password-12",
        role,
      });
      expect(result.ok).toBe(true);
      const payload = mockUserCreate.mock.calls[0]?.[0]?.[0] as { accountStatus: string };
      expect(payload.accountStatus).toBe(AccountStatus.PENDING_APPROVAL);
    }
  });
});
