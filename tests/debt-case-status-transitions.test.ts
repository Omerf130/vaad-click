import { describe, expect, it } from "vitest";

import { AccountStatus } from "@/modules/users/domain/account-status";
import { UserRole } from "@/modules/users/domain/user-role";
import { DebtCaseError } from "@/modules/debt-cases/domain/debt-case-errors";
import { DebtCaseLawyerReviewStatus } from "@/modules/debt-cases/domain/debt-case-lawyer-review-status";
import {
  assertDebtCaseLawyerReviewTransition,
  assertDebtCaseWorkflowTransition,
} from "@/modules/debt-cases/domain/debt-case-status-transitions";
import { DebtCaseWorkflowStatus } from "@/modules/debt-cases/domain/debt-case-workflow-status";

const activeRep = {
  role: UserRole.BUILDING_REP,
  accountStatus: AccountStatus.ACTIVE,
};

const pendingRep = {
  role: UserRole.BUILDING_REP,
  accountStatus: AccountStatus.PENDING_APPROVAL,
};

describe("assertDebtCaseWorkflowTransition", () => {
  it("allows active operator to submit draft to lawyer review", () => {
    expect(() =>
      assertDebtCaseWorkflowTransition({
        from: DebtCaseWorkflowStatus.DRAFT,
        to: DebtCaseWorkflowStatus.AWAITING_LAWYER_REVIEW,
        context: activeRep,
      }),
    ).not.toThrow();
  });

  it("blocks pending-approval operator from submitting", () => {
    expect(() =>
      assertDebtCaseWorkflowTransition({
        from: DebtCaseWorkflowStatus.DRAFT,
        to: DebtCaseWorkflowStatus.AWAITING_LAWYER_REVIEW,
        context: pendingRep,
      }),
    ).toThrow(DebtCaseError);
  });

  it("allows lawyer to return case for completion", () => {
    expect(() =>
      assertDebtCaseWorkflowTransition({
        from: DebtCaseWorkflowStatus.AWAITING_LAWYER_REVIEW,
        to: DebtCaseWorkflowStatus.RETURNED_FOR_COMPLETION,
        context: { role: UserRole.LAWYER_ADMIN, accountStatus: AccountStatus.ACTIVE },
      }),
    ).not.toThrow();
  });
});

describe("assertDebtCaseLawyerReviewTransition", () => {
  it("allows pending to approved for letter prep", () => {
    expect(() =>
      assertDebtCaseLawyerReviewTransition(
        DebtCaseLawyerReviewStatus.PENDING,
        DebtCaseLawyerReviewStatus.APPROVED_FOR_LETTER_PREP,
      ),
    ).not.toThrow();
  });

  it("allows approved to return to pending after invalidation", () => {
    expect(() =>
      assertDebtCaseLawyerReviewTransition(
        DebtCaseLawyerReviewStatus.APPROVED_FOR_LETTER_PREP,
        DebtCaseLawyerReviewStatus.PENDING,
      ),
    ).not.toThrow();
  });
});
