import { DebtCaseLawyerReviewStatus } from "@/modules/debt-cases/domain/debt-case-lawyer-review-status";
import { DebtCaseWorkflowStatus } from "@/modules/debt-cases/domain/debt-case-workflow-status";
import {
  formatLawyerReviewStatusHe,
  formatWorkflowStatusHe,
} from "@/modules/debt-cases/presentation/debt-case-labels.he";
import type { LawyerDebtCaseListParams } from "@/modules/debt-cases/validation/lawyer-debt-case-list.schema";

export type LawyerDebtCaseActiveFilter = {
  key: string;
  label: string;
};

export function isLawyerDebtCaseListDefaultParams(params: LawyerDebtCaseListParams): boolean {
  return (
    !params.q &&
    !params.buildingId &&
    params.workflowStatus === "all" &&
    params.lawyerReviewStatus === DebtCaseLawyerReviewStatus.PENDING &&
    params.page === 1
  );
}

export function describeLawyerDebtCaseActiveFilters(
  params: LawyerDebtCaseListParams,
  buildingNameById: Map<string, string>,
): LawyerDebtCaseActiveFilter[] {
  const filters: LawyerDebtCaseActiveFilter[] = [];

  if (params.q?.trim()) {
    filters.push({ key: "q", label: `חיפוש: ${params.q.trim()}` });
  }
  if (params.buildingId) {
    const name = buildingNameById.get(params.buildingId) ?? "בניין";
    filters.push({ key: "buildingId", label: `בניין: ${name}` });
  }
  if (params.lawyerReviewStatus === "all") {
    filters.push({ key: "lawyerReviewStatus", label: "בדיקת עורך דין: הכל" });
  } else if (params.lawyerReviewStatus !== DebtCaseLawyerReviewStatus.PENDING) {
    filters.push({
      key: "lawyerReviewStatus",
      label: `בדיקת עורך דין: ${formatLawyerReviewStatusHe(params.lawyerReviewStatus)}`,
    });
  } else {
    filters.push({
      key: "lawyerReviewStatus",
      label: `בדיקת עורך דין: ${formatLawyerReviewStatusHe(DebtCaseLawyerReviewStatus.PENDING)}`,
    });
  }
  if (params.workflowStatus === "all") {
    filters.push({ key: "workflowStatus", label: "סטטוס תיק: הכל" });
  } else {
    filters.push({
      key: "workflowStatus",
      label: `סטטוס תיק: ${formatWorkflowStatusHe(params.workflowStatus)}`,
    });
  }

  return filters;
}

export function lawyerDebtCaseWorkflowFilterLabel(value: LawyerDebtCaseListParams["workflowStatus"]): string {
  if (value === "all") {
    return "הכל";
  }
  return formatWorkflowStatusHe(value);
}

export function lawyerDebtCaseReviewFilterLabel(
  value: LawyerDebtCaseListParams["lawyerReviewStatus"],
): string {
  if (value === "all") {
    return "הכל";
  }
  return formatLawyerReviewStatusHe(value);
}

/** Workflow statuses exposed in the lawyer queue filter (subset of domain). */
export const LAWYER_QUEUE_WORKFLOW_FILTER_VALUES = [
  "all",
  DebtCaseWorkflowStatus.AWAITING_LAWYER_REVIEW,
  DebtCaseWorkflowStatus.RETURNED_FOR_COMPLETION,
  DebtCaseWorkflowStatus.REJECTED,
  DebtCaseWorkflowStatus.DRAFT,
  DebtCaseWorkflowStatus.CLOSED_MANUAL,
] as const;
