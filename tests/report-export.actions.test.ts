import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSameOrigin = vi.fn();
const mockRequireReport = vi.fn();
const mockResolveScope = vi.fn();
const mockFetchExport = vi.fn();

vi.mock("@/shared/security/request-origin", () => ({
  assertSameOriginMutationRequest: () => mockSameOrigin(),
}));

vi.mock("@/modules/reports/services/report-scope.service", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@/modules/reports/services/report-scope.service")
  >();
  return {
    ...actual,
    resolveReportScope: (...args: unknown[]) => mockResolveScope(...args),
  };
});

vi.mock("@/modules/reports/services/report-debt-case-query.service", () => ({
  fetchDebtCasesForExport: (...args: unknown[]) => mockFetchExport(...args),
  REPORT_MAX_EXPORT_ROWS: 5000,
}));

vi.mock("@/shared/auth/require-access", () => ({
  requireAuthenticatedPortalSession: () =>
    Promise.resolve({
      user: { id: "u1", role: "lawyer_admin", accountStatus: "active" },
    }),
  requireLawyerAdminPortal: () => mockRequireReport(),
  requireOperationalPortalAccess: () => mockRequireReport(),
}));

describe("exportReportDebtCasesCsvAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSameOrigin.mockResolvedValue(undefined);
    mockRequireReport.mockResolvedValue({
      user: { id: "u1", role: "LAWYER_ADMIN" },
    });
    mockResolveScope.mockResolvedValue({ kind: "lawyer_admin", buildingIds: ["b1"] });
    mockFetchExport.mockResolvedValue([]);
  });

  it("returns forbidden message on scope error", async () => {
    const { ReportAccessError } = await import(
      "@/modules/reports/services/report-scope.service"
    );
    mockResolveScope.mockRejectedValue(new ReportAccessError("denied"));
    const { exportReportDebtCasesCsvAction } = await import(
      "@/modules/reports/actions/report-export.actions"
    );
    const form = new FormData();
    form.set("preset", "last_90");
    form.set("dateField", "submitted");
    const result = await exportReportDebtCasesCsvAction(null, form);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("הרשאה");
    }
  });

  it("returns csv payload on success", async () => {
    mockFetchExport.mockResolvedValue([]);
    const { exportReportDebtCasesCsvAction } = await import(
      "@/modules/reports/actions/report-export.actions"
    );
    const form = new FormData();
    form.set("preset", "all");
    form.set("dateField", "created");
    const result = await exportReportDebtCasesCsvAction(null, form);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.filename).toContain(".csv");
      expect(result.csvBase64.length).toBeGreaterThan(0);
    }
  });
});
