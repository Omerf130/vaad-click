import { describe, expect, it } from "vitest";

import { DebtCaseError, DebtCaseErrorCode } from "@/modules/debt-cases/domain/debt-case-errors";
import { mapLawyerDebtCaseReviewActionError } from "@/modules/debt-cases/presentation/lawyer-debt-case-review-error-map";
import {
  WarningLetterError,
  WarningLetterErrorCode,
} from "@/modules/warning-letters/domain/warning-letter-errors";

describe("lawyer debt case review error mapping", () => {
  it("maps invalid review transition to Hebrew message", () => {
    const state = mapLawyerDebtCaseReviewActionError(
      new DebtCaseError(DebtCaseErrorCode.INVALID_REVIEW_TRANSITION, "x"),
    );
    expect(state.message).toContain("לא ממתין לאישור");
  });

  it("maps missing debtor snapshot data to actionable requirements", () => {
    const state = mapLawyerDebtCaseReviewActionError(
      new WarningLetterError(WarningLetterErrorCode.MISSING_DEBTOR_NAME, "x"),
    );
    expect(state.message).toContain("לא ניתן לאשר");
    expect(state.requirements?.[0]).toContain("שם חייב");
    expect(state.sectionIds).toContain("case-parties");
  });

  it("maps revision conflict for stale approve", () => {
    const state = mapLawyerDebtCaseReviewActionError(
      new DebtCaseError(DebtCaseErrorCode.REVISION_CONFLICT, "stale"),
    );
    expect(state.message).toContain("עודכן במקביל");
  });
});
