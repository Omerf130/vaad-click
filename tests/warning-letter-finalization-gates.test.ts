import { describe, expect, it } from "vitest";

import { DebtCaseLawyerReviewStatus } from "@/modules/debt-cases/domain/debt-case-lawyer-review-status";
import { evaluateBuildingLegalReadiness } from "@/modules/debt-cases/domain/debt-case-legal-readiness";
import { LawyerVerificationStatus } from "@/modules/buildings/domain/building-status";
import { WarningLetterDraftLegalApprovalStatus } from "@/modules/warning-letters/domain/warning-letter-draft-legal-approval-status";
import { WarningLetterDraftLoadState } from "@/modules/warning-letters/domain/warning-letter-draft-load-state";
import { WARNING_LETTER_OPERATIVE_DEADLINE_POLICY_BLOCKED_HE } from "@/modules/warning-letters/domain/warning-letter-operative-policy";
import { collectWarningLetterFinalizationBlockersHe } from "@/modules/warning-letters/services/warning-letter-finalization-gates";

describe("warning letter finalization gates", () => {
  it("blocks finalization while operative deadline policy is unresolved", () => {
    const legalReadiness = evaluateBuildingLegalReadiness({
      lawyerVerificationStatus: LawyerVerificationStatus.VERIFIED,
      engagementSigned: true,
      poaSigned: true,
      legacyFastTrackEligible: false,
    });

    const blockers = collectWarningLetterFinalizationBlockersHe({
      debtCase: {
        lawyerReviewStatus: DebtCaseLawyerReviewStatus.APPROVED_FOR_LETTER_PREP,
      } as never,
      legalReadiness,
      loadState: WarningLetterDraftLoadState.ACTIVE_CURRENT,
      draft: {
        approvalReady: true,
        unapprovedTemplateVariantIds: [],
        snapshot: { isOperativeSnapshot: true },
      } as never,
      legalWordingApprovalStatus: WarningLetterDraftLegalApprovalStatus.APPROVED,
    });

    expect(blockers).toContain(WARNING_LETTER_OPERATIVE_DEADLINE_POLICY_BLOCKED_HE);
  });
});
