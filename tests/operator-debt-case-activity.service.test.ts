import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuditEventType } from "@/shared/audit/domain/audit-event-taxonomy";
import { AccountStatus } from "@/modules/users/domain/account-status";
import { UserRole } from "@/modules/users/domain/user-role";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import { OPERATOR_REJECTION_GENERIC_MESSAGE_HE } from "@/modules/portal/presentation/operator-debt-case-activity.he";

const mockGetDebtCase = vi.fn();
const mockAuditFind = vi.fn();
const mockAuditFindOne = vi.fn();
const mockGetBuildingIds = vi.fn();

vi.mock("@/shared/db/connect", () => ({
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/modules/debt-cases/services/debt-case.service", () => ({
  getDebtCase: (...args: unknown[]) => mockGetDebtCase(...args),
}));

vi.mock("@/modules/audit/infra/audit-event.model", () => ({
  AuditEvent: {
    find: (...args: unknown[]) => mockAuditFind(...args),
    findOne: (...args: unknown[]) => mockAuditFindOne(...args),
  },
}));

vi.mock("@/shared/auth/building-access", () => ({
  getAccessibleBuildingPublicIds: (...args: unknown[]) => mockGetBuildingIds(...args),
}));

const BUILDING_A = "11111111-1111-4111-8111-111111111111";
const CASE_ID = "case-activity-1";

const context: AuthenticatedContext = {
  user: {
    id: "rep",
    role: UserRole.BUILDING_REP,
    accountStatus: AccountStatus.ACTIVE,
    fullName: "Rep",
    email: "rep@test.com",
  },
} as AuthenticatedContext;

describe("operator debt case activity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDebtCase.mockResolvedValue({ debtCaseId: CASE_ID, buildingId: BUILDING_A });
    mockGetBuildingIds.mockResolvedValue([BUILDING_A]);
  });

  it("returns chronological activity with sanitized return comment", async () => {
    mockAuditFind.mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([
        {
          eventType: AuditEventType.DEBT_CASE_RETURNED,
          occurredAt: new Date("2024-02-02T12:00:00Z"),
          targetEntityId: CASE_ID,
          metadata: { buildingId: BUILDING_A, reviewCommentHe: "  חסרה תעודת זהות  " },
        },
        {
          eventType: AuditEventType.DEBT_CASE_SUBMITTED,
          occurredAt: new Date("2024-02-01T10:00:00Z"),
          targetEntityId: CASE_ID,
          metadata: { buildingId: BUILDING_A },
        },
      ]),
    });

    const { loadOperatorDebtCaseActivity } = await import(
      "@/modules/portal/services/operator-debt-case-activity.service"
    );
    const entries = await loadOperatorDebtCaseActivity({ context, debtCaseId: CASE_ID });
    expect(entries).toHaveLength(2);
    expect(entries[0]?.eventType).toBe(AuditEventType.DEBT_CASE_SUBMITTED);
    expect(entries.at(-1)?.eventType).toBe(AuditEventType.DEBT_CASE_RETURNED);
    expect(entries.at(-1)?.detailHe).toBe("חסרה תעודת זהות");
  });

  it("uses generic rejection detail instead of raw audit comment", async () => {
    mockAuditFind.mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([
        {
          eventType: AuditEventType.DEBT_CASE_REJECTED,
          occurredAt: new Date("2024-03-01T09:00:00Z"),
          targetEntityId: CASE_ID,
          metadata: {
            buildingId: BUILDING_A,
            reviewCommentHe: "הערה פנימית שלא לחשיפה",
          },
        },
      ]),
    });

    const { loadOperatorDebtCaseActivity } = await import(
      "@/modules/portal/services/operator-debt-case-activity.service"
    );
    const entries = await loadOperatorDebtCaseActivity({ context, debtCaseId: CASE_ID });
    expect(entries[0]?.detailHe).toBe(OPERATOR_REJECTION_GENERIC_MESSAGE_HE);
  });

  it("loads latest return feedback for correction banner", async () => {
    mockAuditFindOne.mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue({
        metadata: { reviewCommentHe: "עדכנו סכום החוב" },
      }),
    });

    const { loadLatestOperatorReturnFeedbackHe } = await import(
      "@/modules/portal/services/operator-debt-case-activity.service"
    );
    const feedback = await loadLatestOperatorReturnFeedbackHe({ context, debtCaseId: CASE_ID });
    expect(feedback).toBe("עדכנו סכום החוב");
  });

  it("scopes recent building activity to authorized buildings", async () => {
    mockGetBuildingIds.mockResolvedValue([BUILDING_A]);
    mockAuditFind.mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([
        {
          eventType: AuditEventType.DEBT_CASE_DRAFT_CREATED,
          occurredAt: new Date("2024-01-01T08:00:00Z"),
          targetEntityId: CASE_ID,
          metadata: { buildingId: BUILDING_A },
        },
        {
          eventType: AuditEventType.DEBT_CASE_DRAFT_CREATED,
          occurredAt: new Date("2024-01-01T09:00:00Z"),
          targetEntityId: "other-case",
          metadata: { buildingId: "22222222-2222-4222-8222-222222222222" },
        },
      ]),
    });

    const { loadOperatorRecentActivityForBuildings } = await import(
      "@/modules/portal/services/operator-debt-case-activity.service"
    );
    const entries = await loadOperatorRecentActivityForBuildings({
      context,
      buildingIds: [BUILDING_A, "22222222-2222-4222-8222-222222222222"],
    });
    expect(entries).toHaveLength(1);
    expect(entries[0]?.buildingId).toBe(BUILDING_A);
  });
});
