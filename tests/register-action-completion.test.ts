import { beforeEach, describe, expect, it, vi } from "vitest";

import { SessionAuthStage } from "@/modules/auth/domain/session-types";
import { UserRole } from "@/modules/users/domain/user-role";

const mockRegisterPublicUser = vi.fn();
const mockWriteSessionCookie = vi.fn();
const mockRedirect = vi.fn();
const mockRecordFailure = vi.fn();

vi.mock("@/modules/auth/services/register.service", () => ({
  registerPublicUser: (...args: unknown[]) => mockRegisterPublicUser(...args),
}));

vi.mock("@/shared/auth/session-cookie-store", () => ({
  writeSessionCookie: (...args: unknown[]) => mockWriteSessionCookie(...args),
}));

vi.mock("next/navigation", () => ({
  redirect: (path: string) => mockRedirect(path),
}));

vi.mock("@/modules/audit/services/audit-correlation", () => ({
  resolveAuditCorrelationId: vi.fn().mockResolvedValue("corr-1"),
}));

vi.mock("@/shared/security/request-origin", () => ({
  assertSameOriginMutationRequest: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/shared/security/client-ip", () => ({
  getClientIpFromHeaders: vi.fn().mockResolvedValue("127.0.0.1"),
}));

vi.mock("@/shared/security/rate-limit", () => ({
  consumeRateLimit: vi.fn().mockResolvedValue(undefined),
  RateLimitExceededError: class RateLimitExceededError extends Error {},
}));

vi.mock("@/modules/audit/services/auth-audit.service", () => ({
  recordAuthRegistrationFailure: (...args: unknown[]) => mockRecordFailure(...args),
  recordAuthRateLimitExceeded: vi.fn(),
}));

function registrationFormData() {
  const formData = new FormData();
  formData.set("fullName", "Test User");
  formData.set("email", "new@example.com");
  formData.set("password", "valid-password-12");
  formData.set("role", UserRole.BUILDING_REP);
  return formData;
}

describe("registerAction completion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRegisterPublicUser.mockResolvedValue({
      ok: true,
      userId: "507f1f77bcf86cd799439011",
      sessionToken: "opaque-session-token",
    });
    mockWriteSessionCookie.mockResolvedValue(undefined);
    mockRedirect.mockImplementation(() => {
      const error = new Error("NEXT_REDIRECT");
      (error as Error & { digest: string }).digest = "NEXT_REDIRECT;/app/account-status";
      throw error;
    });
  });

  it("sets session cookie and redirects without returning a false error", async () => {
    const { registerAction } = await import("@/modules/auth/actions/auth.actions");

    await expect(registerAction({ ok: true }, registrationFormData())).rejects.toMatchObject({
      digest: expect.stringContaining("NEXT_REDIRECT"),
    });

    expect(mockWriteSessionCookie).toHaveBeenCalledWith(
      "opaque-session-token",
      SessionAuthStage.MFA_COMPLETE,
    );
    expect(mockRedirect).toHaveBeenCalledWith("/app/account-status");
    expect(mockRecordFailure).not.toHaveBeenCalled();
  });

  it("returns Hebrew error when registration service fails before persistence", async () => {
    mockRegisterPublicUser.mockResolvedValue({
      ok: false,
      code: "DUPLICATE_EMAIL",
      message: "duplicate message",
    });

    const { registerAction } = await import("@/modules/auth/actions/auth.actions");
    const result = await registerAction({ ok: true }, registrationFormData());

    expect(result.ok).toBe(false);
    expect(result.message).toBe("duplicate message");
    expect(mockWriteSessionCookie).not.toHaveBeenCalled();
  });

  it("returns a distinct message when cookie write fails after successful registration", async () => {
    mockWriteSessionCookie.mockRejectedValue(new Error("cookie store failed"));

    const { registerAction } = await import("@/modules/auth/actions/auth.actions");
    const result = await registerAction({ ok: true }, registrationFormData());

    expect(result.ok).toBe(false);
    expect(result.message).toContain("החשבון נוצר");
    expect(mockRedirect).not.toHaveBeenCalled();
    expect(mockRecordFailure).toHaveBeenCalled();
  });
});
