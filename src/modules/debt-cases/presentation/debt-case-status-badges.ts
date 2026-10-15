import type { StatusBadgeVariant } from "@/components/ui/StatusBadge/StatusBadge";
import { DebtCaseLawyerReviewStatus } from "@/modules/debt-cases/domain/debt-case-lawyer-review-status";
import type { DebtCaseLawyerReviewStatus as DebtCaseLawyerReviewStatusType } from "@/modules/debt-cases/domain/debt-case-lawyer-review-status";
import { DebtCaseWorkflowStatus } from "@/modules/debt-cases/domain/debt-case-workflow-status";
import type { DebtCaseWorkflowStatus as DebtCaseWorkflowStatusType } from "@/modules/debt-cases/domain/debt-case-workflow-status";
import {
  formatLawyerReviewStatusHe,
  formatWorkflowStatusHe,
} from "@/modules/debt-cases/presentation/debt-case-labels.he";

export function lawyerReviewStatusBadgeVariant(
  status: DebtCaseLawyerReviewStatusType,
): StatusBadgeVariant {
  switch (status) {
    case DebtCaseLawyerReviewStatus.PENDING:
      return "warning";
    case DebtCaseLawyerReviewStatus.APPROVED_FOR_LETTER_PREP:
      return "success";
    case DebtCaseLawyerReviewStatus.RETURNED:
      return "info";
    case DebtCaseLawyerReviewStatus.REJECTED:
      return "error";
    case DebtCaseLawyerReviewStatus.NOT_SUBMITTED:
    default:
      return "neutral";
  }
}

export function workflowStatusBadgeVariant(status: DebtCaseWorkflowStatusType): StatusBadgeVariant {
  switch (status) {
    case DebtCaseWorkflowStatus.AWAITING_LAWYER_REVIEW:
      return "warning";
    case DebtCaseWorkflowStatus.RETURNED_FOR_COMPLETION:
      return "info";
    case DebtCaseWorkflowStatus.REJECTED:
      return "error";
    case DebtCaseWorkflowStatus.DRAFT:
    case DebtCaseWorkflowStatus.AWAITING_BUILDING_VERIFICATION:
      return "neutral";
    case DebtCaseWorkflowStatus.CLOSED_MANUAL:
      return "neutral";
    case DebtCaseWorkflowStatus.LETTER_SENT:
      return "success";
    default:
      return "neutral";
  }
}

export function lawyerReviewStatusBadgeLabel(status: DebtCaseLawyerReviewStatusType): string {
  return formatLawyerReviewStatusHe(status);
}

export function workflowStatusBadgeLabel(status: DebtCaseWorkflowStatusType): string {
  return formatWorkflowStatusHe(status);
}
