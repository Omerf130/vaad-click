import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFindOne = vi.fn();
const mockFindOneAndUpdate = vi.fn();
const mockUpdateOne = vi.fn();
const mockDeleteMany = vi.fn();
const mockCreate = vi.fn();
const mockWithTransaction = vi.fn(async (fn: () => Promise<void>) => fn());
const mockStartSession = vi.fn(() => ({
  withTransaction: mockWithTransaction,
  endSession: vi.fn(),
}));

vi.mock("@/modules/auth/infra/lawyer-admin-setup-token.model", () => ({
  LawyerAdminSetupToken: {
    findOne: (...args: unknown[]) => mockFindOne(...args),
    findOneAndUpdate: (...args: unknown[]) => mockFindOneAndUpdate(...args),
    deleteMany: (...args: unknown[]) => mockDeleteMany(...args),
    create: (...args: unknown[]) => mockCreate(...args),
    db: { startSession: () => mockStartSession() },
  },
}));

vi.mock("@/modules/users/infra/user.model", () => ({
  User: {
    findOne: vi.fn(),
    updateOne: (...args: unknown[]) => mockUpdateOne(...args),
  },
}));

vi.mock("@/modules/users/services/bootstrap-initial-lawyer-admin", () => ({
  findLawyerAdminPendingPasswordSetup: vi.fn(),
}));

vi.mock("@/shared/db/connect", () => ({
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/shared/security/password", () => ({
  hashPassword: vi.fn().mockResolvedValue("hashed-password"),
}));

vi.mock("@/modules/audit/services/auth-audit.service", () => ({
  recordAuthAccountPasswordInitialized: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/shared/config/env.server", () => ({
  getAuthSecret: () => "test-auth-secret-with-sufficient-length-for-hmac-sha256",
}));

describe("completeLawyerAdminSetupWithToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects empty token without touching the database", async () => {
    const { completeLawyerAdminSetupWithToken } = await import(
      "@/modules/auth/services/lawyer-admin-setup-token.service"
    );

    const result = await completeLawyerAdminSetupWithToken({
      rawToken: "",
      password: "valid-password-12",
    });

    expect(result).toEqual({ ok: false, code: "INVALID_TOKEN" });
    expect(mockFindOneAndUpdate).not.toHaveBeenCalled();
  });

  it("rejects invalid or replayed token", async () => {
    mockFindOneAndUpdate.mockResolvedValue(null);
    const { findLawyerAdminPendingPasswordSetup } = await import(
      "@/modules/users/services/bootstrap-initial-lawyer-admin"
    );
    vi.mocked(findLawyerAdminPendingPasswordSetup).mockResolvedValue({
      id: "admin-1",
      fullName: "Admin",
      email: "admin@example.com",
    });

    const { completeLawyerAdminSetupWithToken } = await import(
      "@/modules/auth/services/lawyer-admin-setup-token.service"
    );

    const result = await completeLawyerAdminSetupWithToken({
      rawToken: "invalid-token-value",
      password: "valid-password-12",
    });

    expect(result).toEqual({ ok: false, code: "INVALID_TOKEN" });
  });

  it("completes setup atomically when token is valid", async () => {
    mockFindOneAndUpdate.mockResolvedValue({
      userId: { toString: () => "507f1f77bcf86cd799439011" },
    });
    mockUpdateOne.mockResolvedValue({ modifiedCount: 1 });

    const { completeLawyerAdminSetupWithToken } = await import(
      "@/modules/auth/services/lawyer-admin-setup-token.service"
    );

    const result = await completeLawyerAdminSetupWithToken({
      rawToken: "valid-token-value-123456789012345678901234567890",
      password: "valid-password-12",
    });

    expect(result).toEqual({ ok: true });
    expect(mockFindOneAndUpdate).toHaveBeenCalled();
    expect(mockUpdateOne).toHaveBeenCalled();
  });
});

describe("validateLawyerAdminSetupToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null for unknown token", async () => {
    mockFindOne.mockReturnValue({ lean: async () => null });
    const { validateLawyerAdminSetupToken } = await import(
      "@/modules/auth/services/lawyer-admin-setup-token.service"
    );

    await expect(validateLawyerAdminSetupToken("missing")).resolves.toBeNull();
  });
});
