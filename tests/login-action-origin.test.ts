import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSameOrigin = vi.fn();
const mockLogin = vi.fn();
const mockRateLimit = vi.fn();
const mockEstablishSession = vi.fn();

vi.mock("@/shared/security/request-origin", () => ({
  assertSameOriginMutationRequest: (...args: unknown[]) => mockSameOrigin(...args),
}));

vi.mock("@/modules/auth/services/login.service", () => ({
  loginWithEmailPassword: (...args: unknown[]) => mockLogin(...args),
}));

vi.mock("@/shared/security/rate-limit", () => ({
  consumeRateLimit: (...args: unknown[]) => mockRateLimit(...args),
  RateLimitExceededError: class RateLimitExceededError extends Error {},
}));

vi.mock("@/modules/auth/services/auth-login-session.service", () => ({
  establishLoginSessionWithMandatoryAudit: (...args: unknown[]) => mockEstablishSession(...args),
  LoginSessionEstablishmentError: class LoginSessionEstablishmentError extends Error {},
}));

vi.mock("@/modules/audit/services/auth-audit.service", () => ({
  recordAuthLoginFailure: vi.fn(),
  recordAuthRateLimitExceeded: vi.fn(),
}));

vi.mock("@/modules/audit/services/audit-correlation", () => ({
  resolveAuditCorrelationId: vi.fn().mockResolvedValue("corr-1"),
}));

vi.mock("@/shared/security/client-ip", () => ({
  getClientIpFromHeaders: vi.fn().mockResolvedValue("127.0.0.1"),
}));

vi.mock("@/shared/auth/session-cookie-store", () => ({
  writeSessionCookie: vi.fn(),
}));

describe("loginAction origin gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSameOrigin.mockResolvedValue(undefined);
    mockRateLimit.mockResolvedValue(undefined);
  });

  it("returns rejection message when same-origin check fails", async () => {
    mockSameOrigin.mockRejectedValue(new Error("Cross-origin request rejected"));

    const { loginAction } = await import("@/modules/auth/actions/auth.actions");
    const result = await loginAction(
      { ok: false },
      new FormData(),
    );

    expect(result).toEqual({ ok: false, message: "הבקשה נדחתה." });
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it("proceeds to credential check when same-origin passes", async () => {
    mockLogin.mockResolvedValue({
      ok: false,
      code: "INVALID_CREDENTIALS",
      message: "generic",
    });

    const { loginAction } = await import("@/modules/auth/actions/auth.actions");
    const formData = new FormData();
    formData.set("email", "user@example.com");
    formData.set("password", "valid-password-12");

    const result = await loginAction({ ok: false }, formData);
    expect(mockSameOrigin).toHaveBeenCalled();
    expect(mockLogin).toHaveBeenCalled();
    expect(result.ok).toBe(false);
  });
});
