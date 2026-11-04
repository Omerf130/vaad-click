import { beforeEach, describe, expect, it, vi } from "vitest";

import { MongoServerError } from "mongodb";

import { AccountStatus } from "@/modules/users/domain/account-status";
import { ClientApprovalStatus } from "@/modules/users/domain/client-approval-status";
import { UserRole } from "@/modules/users/domain/user-role";

const USER_ID = "507f1f77bcf86cd799439011";

const mockWithTransaction = vi.fn(async (fn: () => Promise<void>) => fn());
const mockEndSession = vi.fn();
const mockStartSession = vi.fn();

vi.mock("mongoose", async (importOriginal) => {
  const actual = await importOriginal<typeof import("mongoose")>();
  mockStartSession.mockImplementation(() => ({
    withTransaction: mockWithTransaction,
    endSession: mockEndSession,
  }));
  return {
    ...actual,
    default: {
      ...actual.default,
      startSession: mockStartSession,
    },
  };
});

const mockUserCreate = vi.fn();
const mockLean = vi.fn();
const mockQuerySession = vi.fn();
const mockFindById = vi.fn();
const mockOnboardingCreate = vi.fn();
const mockNotify = vi.fn();
const mockCreateSession = vi.fn();

vi.mock("@/modules/users/infra/user.model", () => ({
  User: {
    create: (...args: unknown[]) => mockUserCreate(...args),
    findById: (...args: unknown[]) => mockFindById(...args),
  },
}));

vi.mock("@/modules/debt-cases/infra/pending-building-onboarding-request.model", () => ({
  PendingBuildingOnboardingRequest: {
    create: (...args: unknown[]) => mockOnboardingCreate(...args),
  },
}));

vi.mock("@/shared/security/password", () => ({
  hashPassword: vi.fn().mockResolvedValue("hashed"),
}));

vi.mock("@/modules/auth/services/session.service", () => ({
  createServerSession: (...args: unknown[]) => mockCreateSession(...args),
}));

vi.mock("@/modules/audit/services/auth-audit.service", () => ({
  recordAuthRegistrationSuccess: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/shared/db/connect", () => ({
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/modules/notifications/services/notification-dispatch.service", () => ({
  notifyLawyerAdminsAccountRegistrationPending: (...args: unknown[]) => mockNotify(...args),
}));

describe("registerPublicUser onboarding integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserCreate.mockResolvedValue([{ _id: { toString: () => USER_ID } }]);
    mockQuerySession.mockReturnValue({ lean: mockLean });
    mockFindById.mockReturnValue({ session: mockQuerySession, lean: mockLean });
    mockLean.mockResolvedValue({
      _id: USER_ID,
      accountStatus: AccountStatus.ACTIVE,
    });
    mockOnboardingCreate.mockResolvedValue(undefined);
    mockCreateSession.mockResolvedValue({ token: "session-token", session: {} });
    mockNotify.mockResolvedValue(undefined);
  });

  it("registers a new user and creates onboarding in the same transaction", async () => {
    const { registerPublicUser } = await import("@/modules/auth/services/register.service");

    const result = await registerPublicUser({
      fullName: "New User",
      email: "new-user@example.com",
      password: "valid-password-12",
      role: UserRole.BUILDING_REP,
    });

    expect(result.ok).toBe(true);
    const mongoSession = mockStartSession.mock.results[0]?.value;
    expect(mockUserCreate).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          accountStatus: AccountStatus.ACTIVE,
          clientApprovalStatus: ClientApprovalStatus.AWAITING_SUBMISSION,
        }),
      ],
      expect.objectContaining({ session: mongoSession }),
    );
    expect(mockQuerySession).toHaveBeenCalledWith(mongoSession);
    expect(mockOnboardingCreate).toHaveBeenCalled();
    expect(mockNotify).not.toHaveBeenCalled();
  });

  it("propagates unexpected onboarding failures instead of masking them", async () => {
    mockOnboardingCreate.mockRejectedValue(new Error("onboarding failed"));

    const { registerPublicUser } = await import("@/modules/auth/services/register.service");
    await expect(
      registerPublicUser({
        fullName: "New User",
        email: "fail-user@example.com",
        password: "valid-password-12",
        role: UserRole.MANAGEMENT_COMPANY,
      }),
    ).rejects.toThrow("onboarding failed");
  });

  it("maps onboarding validation failures to a friendly registration error", async () => {
    mockLean.mockResolvedValue(null);

    const { registerPublicUser } = await import("@/modules/auth/services/register.service");
    const result = await registerPublicUser({
      fullName: "New User",
      email: "missing-user@example.com",
      password: "valid-password-12",
      role: UserRole.BUILDING_REP,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("AUDIT_PERSISTENCE");
    }
  });

  it("rejects duplicate email without creating onboarding", async () => {
    mockUserCreate.mockRejectedValue(Object.assign(new MongoServerError("dup"), { code: 11000 }));

    const { registerPublicUser } = await import("@/modules/auth/services/register.service");
    const result = await registerPublicUser({
      fullName: "Dup User",
      email: "dup@example.com",
      password: "valid-password-12",
      role: UserRole.BUILDING_REP,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("DUPLICATE_EMAIL");
    }
    expect(mockOnboardingCreate).not.toHaveBeenCalled();
  });
});
