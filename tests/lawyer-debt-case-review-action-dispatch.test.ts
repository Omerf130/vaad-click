import { beforeEach, describe, expect, it, vi } from "vitest";

import { DebtCaseErrorCode } from "@/modules/debt-cases/domain/debt-case-errors";
import {
  buildLawyerDebtCaseReviewFormData,
  isLawyerDebtCaseReviewInteractionLocked,
  pickLawyerDebtCaseReviewActionFeedback,
  planLawyerReviewConfirmDispatch,
  runLawyerDebtCaseReviewActionInTransition,
} from "@/modules/debt-cases/presentation/lawyer-debt-case-review-action-dispatch";

const CASE_ID = "33333333-3333-4333-8333-333333333333";

describe("lawyer-debt-case-review-action-dispatch", () => {
  it("wraps approve dispatch in startTransition", () => {
    const action = vi.fn();
    const scheduleTransition = vi.fn((callback: () => void) => {
      callback();
    });
    const formData = buildLawyerDebtCaseReviewFormData({ debtCaseId: CASE_ID, revision: 4 });

    runLawyerDebtCaseReviewActionInTransition(action, formData, scheduleTransition);

    expect(scheduleTransition).toHaveBeenCalledTimes(1);
    expect(action).toHaveBeenCalledWith(formData);
    expect(formData.get("debtCaseId")).toBe(CASE_ID);
    expect(formData.get("revision")).toBe("4");
  });

  it("wraps return and reject dispatches in startTransition", () => {
    const returnAction = vi.fn();
    const rejectAction = vi.fn();
    const scheduleTransition = vi.fn((callback: () => void) => {
      callback();
    });
    const returnData = buildLawyerDebtCaseReviewFormData({
      debtCaseId: CASE_ID,
      revision: 1,
      reviewCommentHe: "הערה",
    });
    const rejectData = buildLawyerDebtCaseReviewFormData({
      debtCaseId: CASE_ID,
      revision: 1,
      reviewCommentHe: "דחייה",
    });

    runLawyerDebtCaseReviewActionInTransition(returnAction, returnData, scheduleTransition);
    runLawyerDebtCaseReviewActionInTransition(rejectAction, rejectData, scheduleTransition);

    expect(scheduleTransition).toHaveBeenCalledTimes(2);
    expect(returnAction).toHaveBeenCalledWith(returnData);
    expect(rejectAction).toHaveBeenCalledWith(rejectData);
  });

  it("plans return and reject dispatches with trimmed comment", () => {
    const returnPlan = planLawyerReviewConfirmDispatch({
      confirm: "return",
      debtCaseId: CASE_ID,
      revision: 2,
      comment: "  חסרים מסמכים  ",
    });
    expect(returnPlan).toMatchObject({ kind: "dispatch", confirm: "return" });
    if (returnPlan.kind === "dispatch") {
      expect(returnPlan.formData.get("reviewCommentHe")).toBe("חסרים מסמכים");
    }

    const rejectPlan = planLawyerReviewConfirmDispatch({
      confirm: "reject",
      debtCaseId: CASE_ID,
      revision: 2,
      comment: "סיבת דחייה",
    });
    expect(rejectPlan).toMatchObject({ kind: "dispatch", confirm: "reject" });
  });

  it("blocks return/reject when comment is too short", () => {
    const plan = planLawyerReviewConfirmDispatch({
      confirm: "return",
      debtCaseId: CASE_ID,
      revision: 1,
      comment: "ab",
    });
    expect(plan).toEqual({ kind: "blocked", reason: "comment" });
  });

  it("locks interaction while pending or after confirm dispatch started", () => {
    expect(
      isLawyerDebtCaseReviewInteractionLocked({
        actionPending: false,
        confirmDispatchStarted: false,
      }),
    ).toBe(false);
    expect(
      isLawyerDebtCaseReviewInteractionLocked({
        actionPending: true,
        confirmDispatchStarted: false,
      }),
    ).toBe(true);
    expect(
      isLawyerDebtCaseReviewInteractionLocked({
        actionPending: false,
        confirmDispatchStarted: true,
      }),
    ).toBe(true);
  });

  it("picks the first action state that includes feedback", () => {
    const feedback = pickLawyerDebtCaseReviewActionFeedback([
      { ok: false },
      { ok: false, message: "שגיאת גרסה" },
      { ok: true, message: "הצלחה" },
    ]);
    expect(feedback?.message).toBe("שגיאת גרסה");
  });
});

const mockRequireLawyer = vi.fn();
const mockSameOrigin = vi.fn();
const mockApprove = vi.fn();
const mockReturn = vi.fn();
const mockReject = vi.fn();
const mockRevalidate = vi.fn();

vi.mock("@/shared/auth/require-access", () => ({
  requireLawyerAdminPortal: () => mockRequireLawyer(),
}));

vi.mock("@/shared/security/request-origin", () => ({
  assertSameOriginMutationRequest: () => mockSameOrigin(),
}));

vi.mock("@/modules/audit/services/audit-correlation", () => ({
  resolveAuditCorrelationId: vi.fn().mockResolvedValue("corr-review"),
}));

vi.mock("@/modules/debt-cases/services/debt-case-review.service", () => ({
  approveDebtCaseForLetterPrep: (...args: unknown[]) => mockApprove(...args),
  returnDebtCaseForCompletion: (...args: unknown[]) => mockReturn(...args),
  rejectDebtCase: (...args: unknown[]) => mockReject(...args),
}));

vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidate(...args),
}));

describe("admin debt case review form actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireLawyer.mockResolvedValue({ user: { id: "lawyer-1", role: "lawyer_admin" } });
    mockSameOrigin.mockResolvedValue(undefined);
    mockApprove.mockResolvedValue(undefined);
    mockReturn.mockResolvedValue(undefined);
    mockReject.mockResolvedValue(undefined);
  });

  it("returns Hebrew success on approve", async () => {
    const { approveDebtCaseReviewFormAction } = await import(
      "@/modules/debt-cases/actions/admin-debt-case-review.actions"
    );
    const formData = buildLawyerDebtCaseReviewFormData({ debtCaseId: CASE_ID, revision: 3 });
    const result = await approveDebtCaseReviewFormAction({ ok: false }, formData);
    expect(result.ok).toBe(true);
    expect(result.message).toContain("אושר");
    expect(mockApprove).toHaveBeenCalledWith(
      expect.objectContaining({ debtCaseId: CASE_ID, expectedRevision: 3 }),
    );
  });

  it("validates return comment on the server", async () => {
    const { returnDebtCaseReviewFormAction } = await import(
      "@/modules/debt-cases/actions/admin-debt-case-review.actions"
    );
    const formData = buildLawyerDebtCaseReviewFormData({
      debtCaseId: CASE_ID,
      revision: 1,
      reviewCommentHe: "  ",
    });
    const result = await returnDebtCaseReviewFormAction({ ok: false }, formData);
    expect(result.ok).toBe(false);
    expect(result.message).toContain("3");
    expect(mockReturn).not.toHaveBeenCalled();
  });

  it("maps revision conflict to Hebrew feedback", async () => {
    const { DebtCaseError } = await import("@/modules/debt-cases/domain/debt-case-errors");
    mockApprove.mockRejectedValue(
      new DebtCaseError(DebtCaseErrorCode.REVISION_CONFLICT, "revision mismatch"),
    );

    const { approveDebtCaseReviewFormAction } = await import(
      "@/modules/debt-cases/actions/admin-debt-case-review.actions"
    );
    const formData = buildLawyerDebtCaseReviewFormData({ debtCaseId: CASE_ID, revision: 1 });
    const result = await approveDebtCaseReviewFormAction({ ok: false }, formData);
    expect(result.ok).toBe(false);
    expect(result.code).toBe(DebtCaseErrorCode.REVISION_CONFLICT);
    expect(result.message).toBeTruthy();
  });
});
