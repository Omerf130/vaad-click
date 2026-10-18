import { beforeEach, describe, expect, it, vi } from "vitest";

import { DebtCaseErrorCode } from "@/modules/debt-cases/domain/debt-case-errors";
import { WarningLetterError, WarningLetterErrorCode } from "@/modules/warning-letters/domain/warning-letter-errors";

const mockSameOrigin = vi.fn();
const mockRequireLawyer = vi.fn();
const mockApprove = vi.fn();
const mockRevalidate = vi.fn();

vi.mock("@/shared/security/request-origin", () => ({
  assertSameOriginMutationRequest: (...args: unknown[]) => mockSameOrigin(...args),
}));

vi.mock("@/shared/auth/require-access", () => ({
  requireLawyerAdminPortal: (...args: unknown[]) => mockRequireLawyer(...args),
}));

vi.mock("@/modules/audit/services/audit-correlation", () => ({
  resolveAuditCorrelationId: vi.fn().mockResolvedValue("corr-1"),
}));

vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidate(...args),
}));

vi.mock("@/modules/debt-cases/services/debt-case-review.service", () => ({
  approveDebtCaseForLetterPrep: (...args: unknown[]) => mockApprove(...args),
  returnDebtCaseForCompletion: vi.fn(),
  rejectDebtCase: vi.fn(),
}));

describe("approveDebtCaseReviewFormAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSameOrigin.mockResolvedValue(undefined);
    mockRequireLawyer.mockResolvedValue({ user: { id: "lawyer-1" } });
  });

  it("returns structured requirements when draft snapshot is incomplete", async () => {
    mockApprove.mockRejectedValue(
      new WarningLetterError(WarningLetterErrorCode.MISSING_DEBTOR_NAME, "missing"),
    );

    const { approveDebtCaseReviewFormAction } = await import(
      "@/modules/debt-cases/actions/admin-debt-case-review.actions"
    );

    const formData = new FormData();
    formData.set("debtCaseId", "33333333-3333-4333-8333-333333333333");
    formData.set("revision", "2");

    const result = await approveDebtCaseReviewFormAction({ ok: false }, formData);
    expect(result.ok).toBe(false);
    expect(result.requirements?.length).toBeGreaterThan(0);
    expect(result.message).toContain("לא ניתן לאשר");
  });

  it("returns revision conflict message", async () => {
    const { DebtCaseError } = await import("@/modules/debt-cases/domain/debt-case-errors");
    mockApprove.mockRejectedValue(new DebtCaseError(DebtCaseErrorCode.REVISION_CONFLICT, "stale"));

    const { approveDebtCaseReviewFormAction } = await import(
      "@/modules/debt-cases/actions/admin-debt-case-review.actions"
    );

    const formData = new FormData();
    formData.set("debtCaseId", "33333333-3333-4333-8333-333333333333");
    formData.set("revision", "1");

    const result = await approveDebtCaseReviewFormAction({ ok: false }, formData);
    expect(result.message).toContain("עודכן במקביל");
  });
});
