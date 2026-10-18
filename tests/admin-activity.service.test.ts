import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuditEventType } from "@/shared/audit/domain/audit-event-taxonomy";
import { UserRole } from "@/modules/users/domain/user-role";
import { AccountStatus } from "@/modules/users/domain/account-status";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";

const mockAuditFind = vi.fn();

vi.mock("@/modules/audit/infra/audit-event.model", () => ({
  AuditEvent: {
    find: (...args: unknown[]) => mockAuditFind(...args),
  },
}));

vi.mock("@/shared/db/connect", () => ({
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

const lawyerContext: AuthenticatedContext = {
  user: {
    id: "lawyer",
    role: UserRole.LAWYER_ADMIN,
    accountStatus: AccountStatus.ACTIVE,
    fullName: "Lawyer",
    email: "lawyer@test.com",
  },
} as AuthenticatedContext;

describe("admin activity service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuditFind.mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([
        {
          eventType: AuditEventType.DEBT_CASE_SUBMITTED,
          occurredAt: new Date("2024-01-01T10:00:00Z"),
          targetEntityType: "debt_case",
          targetEntityId: "case-1",
          metadata: {},
        },
      ]),
    });
  });

  it("loads dashboard activity with Hebrew titles", async () => {
    const { loadAdminDashboardRecentActivity } = await import(
      "@/modules/admin/services/admin-activity.service"
    );
    const entries = await loadAdminDashboardRecentActivity({ context: lawyerContext });
    expect(entries[0]?.titleHe).toContain("הוגש");
  });

  it("includes return comments on debt case timeline", async () => {
    mockAuditFind.mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([
        {
          eventType: AuditEventType.DEBT_CASE_RETURNED,
          occurredAt: new Date("2024-02-01T12:00:00Z"),
          targetEntityType: "debt_case",
          targetEntityId: "case-1",
          metadata: { reviewCommentHe: "חסר מסמך" },
        },
      ]),
    });
    const { loadAdminDebtCaseActivity } = await import(
      "@/modules/admin/services/admin-activity.service"
    );
    const entries = await loadAdminDebtCaseActivity({
      context: lawyerContext,
      debtCaseId: "case-1",
    });
    expect(entries[0]?.detailHe).toBe("חסר מסמך");
  });
});
