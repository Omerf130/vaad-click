import { describe, expect, it } from "vitest";

import { DebtCaseLawyerReviewStatus } from "@/modules/debt-cases/domain/debt-case-lawyer-review-status";
import { DebtCaseWorkflowStatus } from "@/modules/debt-cases/domain/debt-case-workflow-status";
import {
  lawyerReviewStatusBadgeLabel,
  lawyerReviewStatusBadgeVariant,
  workflowStatusBadgeVariant,
} from "@/modules/debt-cases/presentation/debt-case-status-badges";

describe("debt case status badges", () => {
  it("maps lawyer review statuses to semantic variants", () => {
    expect(lawyerReviewStatusBadgeVariant(DebtCaseLawyerReviewStatus.PENDING)).toBe("warning");
    expect(lawyerReviewStatusBadgeVariant(DebtCaseLawyerReviewStatus.APPROVED_FOR_LETTER_PREP)).toBe(
      "success",
    );
    expect(lawyerReviewStatusBadgeVariant(DebtCaseLawyerReviewStatus.REJECTED)).toBe("error");
    expect(lawyerReviewStatusBadgeVariant(DebtCaseLawyerReviewStatus.RETURNED)).toBe("info");
  });

  it("keeps Hebrew labels for accessibility", () => {
    expect(lawyerReviewStatusBadgeLabel(DebtCaseLawyerReviewStatus.PENDING)).toContain("ממתין");
  });

  it("maps workflow returned status to info variant", () => {
    expect(workflowStatusBadgeVariant(DebtCaseWorkflowStatus.RETURNED_FOR_COMPLETION)).toBe("info");
  });
});
