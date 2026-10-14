import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRequireLawyer = vi.fn();
const mockSameOrigin = vi.fn();
const mockHistory = vi.fn();
const mockGetDraft = vi.fn();
const mockCreateDraft = vi.fn();
const mockPublish = vi.fn();
const mockRevalidate = vi.fn();

vi.mock("@/shared/auth/require-access", () => ({
  requireLawyerAdminPortal: () => mockRequireLawyer(),
}));

vi.mock("@/shared/security/request-origin", () => ({
  assertSameOriginMutationRequest: () => mockSameOrigin(),
}));

vi.mock("@/modules/audit/services/audit-correlation", () => ({
  resolveAuditCorrelationId: vi.fn().mockResolvedValue("corr-1"),
}));

vi.mock("@/modules/financial-settings/services/financial-settings-query.service", () => ({
  getPublishedFinancialSettingsHistory: (...args: unknown[]) => mockHistory(...args),
  getCurrentFinancialSettingsDraft: (...args: unknown[]) => mockGetDraft(...args),
}));

vi.mock("@/modules/financial-settings/services/financial-settings-draft.service", () => ({
  createFinancialSettingsDraft: (...args: unknown[]) => mockCreateDraft(...args),
  createFinancialSettingsDraftFromPublished: vi.fn(),
  updateFinancialSettingsDraft: vi.fn(),
  discardFinancialSettingsDraft: vi.fn(),
}));

vi.mock("@/modules/financial-settings/services/financial-settings-publish.service", () => ({
  publishFinancialSettingsDraft: (...args: unknown[]) => mockPublish(...args),
}));

vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidate(...args),
}));

describe("financial settings server actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireLawyer.mockResolvedValue({ user: { id: "1", role: "lawyer_admin" } });
    mockSameOrigin.mockResolvedValue(undefined);
    mockCreateDraft.mockResolvedValue(undefined);
    mockPublish.mockResolvedValue(undefined);
  });

  it("applies suggested percentage defaults only when no published versions exist", async () => {
    mockHistory.mockResolvedValue([]);
    const { createFinancialSettingsDraftFormAction } = await import(
      "@/modules/financial-settings/actions/financial-settings.actions"
    );
    const result = await createFinancialSettingsDraftFormAction(
      { ok: true },
      new FormData(),
    );
    expect(result.ok).toBe(true);
    expect(mockCreateDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        initial: expect.objectContaining({
          platformFees: expect.objectContaining({
            trustAccountProcessingFeeBasisPoints: 230,
            committeeTransferFeeBasisPoints: 50,
          }),
          escalation: expect.objectContaining({
            recoveryFeeRateBasisPoints: 2000,
          }),
        }),
      }),
    );
    const call = mockCreateDraft.mock.calls[0]?.[0] as { initial?: { amounts?: unknown } };
    expect(call.initial?.amounts).toBeUndefined();
  });

  it("does not apply suggested values when published versions exist", async () => {
    mockHistory.mockResolvedValue([{ settingsVersionId: "v1" }]);
    const { createFinancialSettingsDraftFormAction } = await import(
      "@/modules/financial-settings/actions/financial-settings.actions"
    );
    await createFinancialSettingsDraftFormAction({ ok: true }, new FormData());
    expect(mockCreateDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        initial: undefined,
      }),
    );
  });

  it("requires explicit publish confirmation", async () => {
    const { publishFinancialSettingsDraftAction } = await import(
      "@/modules/financial-settings/actions/financial-settings.actions"
    );
    const form = new FormData();
    form.set("confirmPublish", "no");
    form.set("revision", "1");
    form.set("effectiveFromIso", "2030-01-01");
    const result = await publishFinancialSettingsDraftAction({ ok: true }, form);
    expect(result.ok).toBe(false);
    expect(mockPublish).not.toHaveBeenCalled();
  });

  it("rejects publish when draft revision is stale", async () => {
    mockGetDraft.mockResolvedValue({ revision: 2, settingsVersionId: "d1" });
    const { publishFinancialSettingsDraftAction } = await import(
      "@/modules/financial-settings/actions/financial-settings.actions"
    );
    const form = new FormData();
    form.set("confirmPublish", "yes");
    form.set("revision", "1");
    form.set("effectiveFromIso", "2030-01-01");
    const result = await publishFinancialSettingsDraftAction({ ok: true }, form);
    expect(result.ok).toBe(false);
    expect(mockPublish).not.toHaveBeenCalled();
  });
});
