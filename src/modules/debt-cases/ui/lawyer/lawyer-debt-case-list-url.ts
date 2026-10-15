import { DebtCaseLawyerReviewStatus } from "@/modules/debt-cases/domain/debt-case-lawyer-review-status";
import type { LawyerDebtCaseListParams } from "@/modules/debt-cases/validation/lawyer-debt-case-list.schema";

export function buildLawyerDebtCaseListHref(params: LawyerDebtCaseListParams): string {
  const search = new URLSearchParams();
  if (params.q) {
    search.set("q", params.q);
  }
  if (params.buildingId) {
    search.set("buildingId", params.buildingId);
  }
  if (params.workflowStatus && params.workflowStatus !== "all") {
    search.set("workflowStatus", params.workflowStatus);
  } else if (params.lawyerReviewStatus === "all") {
    search.set("workflowStatus", "all");
  }
  if (params.lawyerReviewStatus === "all") {
    search.set("lawyerReviewStatus", "all");
  } else if (
    params.lawyerReviewStatus &&
    params.lawyerReviewStatus !== DebtCaseLawyerReviewStatus.PENDING
  ) {
    search.set("lawyerReviewStatus", params.lawyerReviewStatus);
  }
  if (params.page > 1) {
    search.set("page", String(params.page));
  }
  const query = search.toString();
  return query ? `/app/admin/debt-cases?${query}` : "/app/admin/debt-cases";
}

export const LAWYER_DEBT_CASE_LIST_CLEAR_HREF = "/app/admin/debt-cases";
