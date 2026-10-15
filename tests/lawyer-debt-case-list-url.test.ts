import { describe, expect, it } from "vitest";

import { DebtCaseLawyerReviewStatus } from "@/modules/debt-cases/domain/debt-case-lawyer-review-status";
import { buildLawyerDebtCaseListHref } from "@/modules/debt-cases/ui/lawyer/lawyer-debt-case-list-url";

describe("lawyer debt case list href", () => {
  it("preserves explicit review-status all in pagination links", () => {
    const href = buildLawyerDebtCaseListHref({
      q: undefined,
      buildingId: undefined,
      workflowStatus: "all",
      lawyerReviewStatus: "all",
      page: 2,
    });
    expect(href).toContain("lawyerReviewStatus=all");
    expect(href).toContain("workflowStatus=all");
    expect(href).toContain("page=2");
  });

  it("omits pending review filter from clean default URLs", () => {
    const href = buildLawyerDebtCaseListHref({
      q: undefined,
      buildingId: undefined,
      workflowStatus: "all",
      lawyerReviewStatus: DebtCaseLawyerReviewStatus.PENDING,
      page: 1,
    });
    expect(href).toBe("/app/admin/debt-cases");
  });
});
