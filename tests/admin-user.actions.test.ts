import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSameOrigin = vi.fn();
const mockRequireLawyer = vi.fn();
const mockApprove = vi.fn();
const mockReject = vi.fn();
const mockReconsider = vi.fn();
const mockRevalidate = vi.fn();

vi.mock("@/shared/security/request-origin", () => ({
  assertSameOriginMutationRequest: (...args: unknown[]) => mockSameOrigin(...args),
}));

vi.mock("@/shared/auth/require-access", () => ({
  requireLawyerAdminPortal: (...args: unknown[]) => mockRequireLawyer(...args),
}));

vi.mock("@/modules/organizations/services/account-approval.service", () => ({
  approveRegisteredAccount: (...args: unknown[]) => mockApprove(...args),
  rejectRegisteredAccount: (...args: unknown[]) => mockReject(...args),
  reconsiderRejectedAccount: (...args: unknown[]) => mockReconsider(...args),
}));

vi.mock("@/modules/audit/services/audit-correlation", () => ({
  resolveAuditCorrelationId: vi.fn().mockResolvedValue("corr-1"),
}));

vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidate(...args),
}));

describe("admin user approval actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSameOrigin.mockResolvedValue(undefined);
    mockRequireLawyer.mockResolvedValue({ user: { id: "lawyer-1" } });
    mockApprove.mockResolvedValue(undefined);
    mockReject.mockResolvedValue(undefined);
    mockReconsider.mockResolvedValue(undefined);
  });

  it("approves pending users through CP6A service", async () => {
    const { approveRegisteredUserAction } = await import(
      "@/modules/users/actions/admin-user.actions"
    );
    const formData = new FormData();
    formData.set("targetUserId", "507f1f77bcf86cd799439011");

    const result = await approveRegisteredUserAction({ ok: false }, formData);
    expect(result.ok).toBe(true);
    expect(mockApprove).toHaveBeenCalled();
    expect(mockRevalidate).toHaveBeenCalledWith("/app/admin/users");
  });

  it("rejects invalid user ids", async () => {
    const { rejectRegisteredUserAction } = await import(
      "@/modules/users/actions/admin-user.actions"
    );
    const formData = new FormData();
    formData.set("targetUserId", "not-valid");

    const result = await rejectRegisteredUserAction({ ok: false }, formData);
    expect(result.ok).toBe(false);
    expect(mockReject).not.toHaveBeenCalled();
  });
});
