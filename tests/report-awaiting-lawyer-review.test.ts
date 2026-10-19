import { describe, expect, it } from "vitest";

import { DebtCaseLawyerReviewStatus } from "@/modules/debt-cases/domain/debt-case-lawyer-review-status";
import { DebtCaseWorkflowStatus } from "@/modules/debt-cases/domain/debt-case-workflow-status";
import {
  isDebtCaseAwaitingLawyerReview,
  mongoAggCountIfAwaitingLawyerReview,
} from "@/modules/reports/domain/report-awaiting-lawyer-review";

describe("isDebtCaseAwaitingLawyerReview", () => {
  it("requires both workflow awaiting review and lawyer review pending", () => {
    expect(
      isDebtCaseAwaitingLawyerReview({
        workflowStatus: DebtCaseWorkflowStatus.AWAITING_LAWYER_REVIEW,
        lawyerReviewStatus: DebtCaseLawyerReviewStatus.PENDING,
      }),
    ).toBe(true);
  });

  it("excludes pending lawyer status when workflow is not awaiting review", () => {
    expect(
      isDebtCaseAwaitingLawyerReview({
        workflowStatus: DebtCaseWorkflowStatus.DRAFT,
        lawyerReviewStatus: DebtCaseLawyerReviewStatus.PENDING,
      }),
    ).toBe(false);
    expect(
      isDebtCaseAwaitingLawyerReview({
        workflowStatus: DebtCaseWorkflowStatus.RETURNED_FOR_COMPLETION,
        lawyerReviewStatus: DebtCaseLawyerReviewStatus.PENDING,
      }),
    ).toBe(false);
  });

  it("excludes cases still in awaiting workflow after a lawyer decision", () => {
    expect(
      isDebtCaseAwaitingLawyerReview({
        workflowStatus: DebtCaseWorkflowStatus.AWAITING_LAWYER_REVIEW,
        lawyerReviewStatus: DebtCaseLawyerReviewStatus.APPROVED_FOR_LETTER_PREP,
      }),
    ).toBe(false);
    expect(
      isDebtCaseAwaitingLawyerReview({
        workflowStatus: DebtCaseWorkflowStatus.AWAITING_LAWYER_REVIEW,
        lawyerReviewStatus: DebtCaseLawyerReviewStatus.REJECTED,
      }),
    ).toBe(false);
  });
});

describe("mongoAggCountIfAwaitingLawyerReview", () => {
  it("matches the shared lifecycle predicate in aggregation form", () => {
    const expr = mongoAggCountIfAwaitingLawyerReview();
    expect(expr).toEqual({
      $cond: [
        {
          $and: [
            { $eq: ["$workflowStatus", DebtCaseWorkflowStatus.AWAITING_LAWYER_REVIEW] },
            { $eq: ["$lawyerReviewStatus", DebtCaseLawyerReviewStatus.PENDING] },
          ],
        },
        1,
        0,
      ],
    });
  });
});
