import { beforeEach, describe, expect, it, vi } from "vitest";

const mockInsert = vi.fn();
const mockLawyerIds = vi.fn();
const mockOperatorIds = vi.fn();
const mockMcIds = vi.fn();

vi.mock("@/modules/notifications/services/notification-write.service", () => ({
  insertNotificationsIdempotent: (...args: unknown[]) => mockInsert(...args),
}));

vi.mock("@/modules/notifications/services/notification-recipients.service", () => ({
  listActiveLawyerAdminUserIds: (...args: unknown[]) => mockLawyerIds(...args),
  listOperatorRecipientUserIdsForBuilding: (...args: unknown[]) => mockOperatorIds(...args),
  listManagementCompanyRecipientUserIds: (...args: unknown[]) => mockMcIds(...args),
}));

describe("notification dispatch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsert.mockResolvedValue(undefined);
    mockLawyerIds.mockResolvedValue(["lawyer-a", "lawyer-b"]);
    mockOperatorIds.mockResolvedValue(["op-1"]);
    mockMcIds.mockResolvedValue(["mc-1"]);
  });

  it("notifies all active lawyer admins on debt case submit with per-recipient idempotency", async () => {
    const { notifyLawyerAdminsDebtCaseSubmitted } = await import(
      "@/modules/notifications/services/notification-dispatch.service"
    );
    await notifyLawyerAdminsDebtCaseSubmitted({
      debtCaseId: "case-99",
      buildingId: "b-1",
      revision: 1,
      apartmentLabel: "3",
      resubmitted: false,
    });

    expect(mockInsert).toHaveBeenCalledOnce();
    const payload = mockInsert.mock.calls[0][0];
    expect(payload.notifications).toHaveLength(2);
    expect(payload.notifications[0].idempotencyKey).toBe(
      "debt_case_submitted:case-99:1:lawyer-a",
    );
    expect(payload.notifications[1].idempotencyKey).toBe(
      "debt_case_submitted:case-99:1:lawyer-b",
    );
    expect(payload.notifications[0].eventType).toBe("debt_case_submitted");
  });

  it("uses resubmitted event type and keys", async () => {
    const { notifyLawyerAdminsDebtCaseSubmitted } = await import(
      "@/modules/notifications/services/notification-dispatch.service"
    );
    await notifyLawyerAdminsDebtCaseSubmitted({
      debtCaseId: "case-99",
      buildingId: "b-1",
      revision: 2,
      apartmentLabel: "3",
      resubmitted: true,
    });
    const payload = mockInsert.mock.calls[0][0];
    expect(payload.notifications[0].eventType).toBe("debt_case_resubmitted");
    expect(payload.notifications[0].idempotencyKey).toContain("debt_case_resubmitted");
  });

  it("notifies operators on lawyer return with stable idempotency", async () => {
    const { notifyOperatorsDebtCaseReviewOutcome } = await import(
      "@/modules/notifications/services/notification-dispatch.service"
    );
    await notifyOperatorsDebtCaseReviewOutcome({
      debtCaseId: "case-1",
      buildingId: "b-1",
      revision: 4,
      apartmentLabel: "12",
      outcome: "returned",
      submitterUserId: "submitter-1",
    });
    expect(mockOperatorIds).toHaveBeenCalledWith({
      buildingId: "b-1",
      extraUserIds: ["submitter-1"],
    });
    const payload = mockInsert.mock.calls[0][0];
    expect(payload.notifications[0].eventType).toBe("debt_case_returned");
    expect(payload.notifications[0].idempotencyKey).toBe(
      "debt_case_returned:case-1:4:op-1",
    );
  });
});
