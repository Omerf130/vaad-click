import { beforeEach, describe, expect, it, vi } from "vitest";

import { AccountStatus } from "@/modules/users/domain/account-status";
import { UserRole } from "@/modules/users/domain/user-role";

const mockFindOne = vi.fn();
vi.mock("@/modules/users/infra/user.model", () => ({
  User: {
    findOne: (...args: unknown[]) => mockFindOne(...args),
  },
}));

vi.mock("@/shared/db/connect", () => ({
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/shared/security/password", () => ({
  verifyPassword: vi.fn().mockResolvedValue(true),
}));

describe("loginWithEmailPassword", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns generic failure when user is missing", async () => {
    mockFindOne.mockReturnValue({
      select: () => ({ lean: async () => null }),
    });

    const { loginWithEmailPassword } = await import(
      "@/modules/auth/services/login.service"
    );
    const result = await loginWithEmailPassword({
      email: "missing@example.com",
      password: "valid-password-12",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("INVALID_CREDENTIALS");
    }
  });

  it("allows login for pending_approval building rep", async () => {
    mockFindOne.mockReturnValue({
      select: () => ({
        lean: async () => ({
          _id: { toString: () => "id-pending" },
          passwordHash: "$argon2id$v=19$m=19456,t=2,p=1$abc",
          accountStatus: AccountStatus.PENDING_APPROVAL,
          role: UserRole.BUILDING_REP,
        }),
      }),
    });

    const { loginWithEmailPassword } = await import(
      "@/modules/auth/services/login.service"
    );
    const result = await loginWithEmailPassword({
      email: "pending@example.com",
      password: "valid-password-12",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.accountStatus).toBe(AccountStatus.PENDING_APPROVAL);
    }
  });

  it("returns generic failure for locked accounts", async () => {
    mockFindOne.mockReturnValue({
      select: () => ({
        lean: async () => ({
          _id: { toString: () => "id-1" },
          passwordHash: "$argon2id$v=19$m=19456,t=2,p=1$abc",
          accountStatus: AccountStatus.LOCKED,
          role: UserRole.BUILDING_REP,
        }),
      }),
    });

    const { loginWithEmailPassword } = await import(
      "@/modules/auth/services/login.service"
    );
    const result = await loginWithEmailPassword({
      email: "locked@example.com",
      password: "valid-password-12",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("ACCOUNT_LOCKED");
    }
  });
});
