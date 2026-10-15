import { DebtCaseError, DebtCaseErrorCode } from "@/modules/debt-cases/domain/debt-case-errors";
import { DebtCaseLawyerReviewStatus } from "@/modules/debt-cases/domain/debt-case-lawyer-review-status";
import { DebtCaseWorkflowStatus } from "@/modules/debt-cases/domain/debt-case-workflow-status";

export type DebtCaseEditPolicyInput = {
  workflowStatus: DebtCaseWorkflowStatus;
  letterSentAtIso: string | null;
};

export function assertDebtCaseContentEditable(input: DebtCaseEditPolicyInput): void {
  if (input.letterSentAtIso) {
    throw new DebtCaseError(
      DebtCaseErrorCode.EDIT_NOT_ALLOWED,
      "Debt case content is frozen after a warning letter was sent",
    );
  }

  const editableStatuses: DebtCaseWorkflowStatus[] = [
    DebtCaseWorkflowStatus.DRAFT,
    DebtCaseWorkflowStatus.RETURNED_FOR_COMPLETION,
    DebtCaseWorkflowStatus.AWAITING_LAWYER_REVIEW,
  ];

  if (!editableStatuses.includes(input.workflowStatus)) {
    throw new DebtCaseError(
      DebtCaseErrorCode.EDIT_NOT_ALLOWED,
      "Debt case content cannot be edited in the current workflow status",
    );
  }
}

/**
 * Operator edits while awaiting lawyer review invalidate prior approval (lawyer questionnaire).
 */
export function lawyerReviewStatusAfterOperatorContentEdit(input: {
  workflowStatus: DebtCaseWorkflowStatus;
  previousLawyerReviewStatus: DebtCaseLawyerReviewStatus;
}): DebtCaseLawyerReviewStatus {
  if (input.workflowStatus !== DebtCaseWorkflowStatus.AWAITING_LAWYER_REVIEW) {
    return input.previousLawyerReviewStatus;
  }

  if (
    input.previousLawyerReviewStatus ===
    DebtCaseLawyerReviewStatus.APPROVED_FOR_LETTER_PREP
  ) {
    return DebtCaseLawyerReviewStatus.PENDING;
  }

  return input.previousLawyerReviewStatus;
}
