import { DebtCaseLawyerReviewStatus } from "@/modules/debt-cases/domain/debt-case-lawyer-review-status";
import { DebtCaseWorkflowStatus } from "@/modules/debt-cases/domain/debt-case-workflow-status";

/**
 * Same definition as admin queues and lawyer review actions:
 * submitted for review and no decision recorded yet.
 */
export function isDebtCaseAwaitingLawyerReview(input: {
  workflowStatus: DebtCaseWorkflowStatus;
  lawyerReviewStatus: DebtCaseLawyerReviewStatus;
}): boolean {
  return (
    input.workflowStatus === DebtCaseWorkflowStatus.AWAITING_LAWYER_REVIEW &&
    input.lawyerReviewStatus === DebtCaseLawyerReviewStatus.PENDING
  );
}

/** MongoDB aggregation expression: 1 when awaiting lawyer review, else 0. */
export function mongoAggCountIfAwaitingLawyerReview(): Record<string, unknown> {
  return {
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
  };
}
