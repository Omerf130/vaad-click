import { describe, expect, it } from "vitest";

import { DebtCaseError } from "@/modules/debt-cases/domain/debt-case-errors";
import {
  assertDebtCaseContentEditable,
  lawyerReviewStatusAfterOperatorContentEdit,
} from "@/modules/debt-cases/domain/debt-case-edit-policy";
import { DebtCaseLawyerReviewStatus } from "@/modules/debt-cases/domain/debt-case-lawyer-review-status";
import { DebtCaseWorkflowStatus } from "@/modules/debt-cases/domain/debt-case-workflow-status";

describe("debt case edit policy", () => {
  it("blocks edit after letter sent", () => {
    expect(() =>
      assertDebtCaseContentEditable({
        workflowStatus: DebtCaseWorkflowStatus.AWAITING_LAWYER_REVIEW,
        letterSentAtIso: "2026-01-01T00:00:00.000Z",
      }),
    ).toThrow(DebtCaseError);
  });

  it("invalidates lawyer approval when operator edits during review", () => {
    const next = lawyerReviewStatusAfterOperatorContentEdit({
      workflowStatus: DebtCaseWorkflowStatus.AWAITING_LAWYER_REVIEW,
      previousLawyerReviewStatus: DebtCaseLawyerReviewStatus.APPROVED_FOR_LETTER_PREP,
    });
    expect(next).toBe(DebtCaseLawyerReviewStatus.PENDING);
  });
});
