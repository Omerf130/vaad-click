import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSave = vi.fn();
const mockRevalidatePath = vi.fn();

vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

vi.mock("@/shared/security/request-origin", () => ({
  assertSameOriginMutationRequest: vi.fn(),
}));

vi.mock("@/shared/auth/require-access", () => ({
  requireLawyerAdminPortal: vi.fn().mockResolvedValue({ user: { id: "u1" } }),
}));

vi.mock("@/modules/audit/services/audit-correlation", () => ({
  resolveAuditCorrelationId: vi.fn().mockResolvedValue("corr-1"),
}));

vi.mock("@/modules/warning-letters/services/warning-letter-draft-edit.service", () => ({
  saveWarningLetterDraftClauseEdits: (...args: unknown[]) => mockSave(...args),
}));

describe("saveWarningLetterDraftEditsFormAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes parsed clause overrides to the edit service", async () => {
    mockSave.mockResolvedValue({
      draftId: "new-draft",
      draftRevision: 8,
      concurrencyRevision: 1,
      unchanged: false,
    });

    const { saveWarningLetterDraftEditsFormAction } = await import(
      "@/modules/warning-letters/actions/lawyer-warning-letter-draft.actions"
    );

    const formData = new FormData();
    formData.set("debtCaseId", "case-1");
    formData.set("sourceDraftId", "draft-old");
    formData.set("expectedConcurrencyRevision", "2");
    formData.set("clause__legal_basis_section_58", "updated clause 2");

    const state = await saveWarningLetterDraftEditsFormAction({ ok: false }, formData);

    expect(state.ok).toBe(true);
    expect(state.savedDraftRevision).toBe(8);
    expect(state.unchanged).toBe(false);
    expect(mockSave).toHaveBeenCalledWith(
      expect.objectContaining({
        debtCaseId: "case-1",
        sourceDraftId: "draft-old",
        expectedConcurrencyRevision: 2,
        clauseOverrides: { legal_basis_section_58: "updated clause 2" },
      }),
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith("/app/admin/debt-cases/case-1");
  });

  it("does not revalidate when save is a no-op", async () => {
    mockSave.mockResolvedValue({
      draftId: "draft-old",
      draftRevision: 7,
      concurrencyRevision: 2,
      unchanged: true,
    });

    const { saveWarningLetterDraftEditsFormAction } = await import(
      "@/modules/warning-letters/actions/lawyer-warning-letter-draft.actions"
    );

    const formData = new FormData();
    formData.set("debtCaseId", "case-1");
    formData.set("sourceDraftId", "draft-old");
    formData.set("expectedConcurrencyRevision", "2");
    formData.set("clause__legal_basis_section_58", "same text");

    const state = await saveWarningLetterDraftEditsFormAction({ ok: false }, formData);

    expect(state.ok).toBe(true);
    expect(state.unchanged).toBe(true);
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });
});
