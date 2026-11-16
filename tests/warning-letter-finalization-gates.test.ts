import { describe, expect, it } from "vitest";

import { DebtCaseLawyerReviewStatus } from "@/modules/debt-cases/domain/debt-case-lawyer-review-status";
import { evaluateBuildingLegalReadiness } from "@/modules/debt-cases/domain/debt-case-legal-readiness";
import { LawyerVerificationStatus } from "@/modules/buildings/domain/building-status";
import { WarningLetterDraftLegalApprovalStatus } from "@/modules/warning-letters/domain/warning-letter-draft-legal-approval-status";
import { WarningLetterDraftLoadState } from "@/modules/warning-letters/domain/warning-letter-draft-load-state";
import { WARNING_LETTER_OPERATIVE_DEADLINE_POLICY_BLOCKED_HE } from "@/modules/warning-letters/domain/warning-letter-operative-policy";
import { collectWarningLetterFinalizationBlockersHe } from "@/modules/warning-letters/services/warning-letter-finalization-gates";

const legalReadiness = evaluateBuildingLegalReadiness({
  lawyerVerificationStatus: LawyerVerificationStatus.VERIFIED,
  engagementSigned: true,
  poaSigned: true,
  legacyFastTrackEligible: false,
});

const readyGateBase = {
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
  operativeDeadlinePolicyConfirmed: false,
  operativeSnapshotForFinalize: null,
};

describe("warning letter finalization gates", () => {
  it("blocks finalization while operative deadline policy is unresolved", () => {
    const blockers = collectWarningLetterFinalizationBlockersHe(readyGateBase);
    expect(blockers).toContain(WARNING_LETTER_OPERATIVE_DEADLINE_POLICY_BLOCKED_HE);
  });

  it("blocks finalization without approved wording", () => {
    const blockers = collectWarningLetterFinalizationBlockersHe({
      ...readyGateBase,
      operativeDeadlinePolicyConfirmed: true,
      legalWordingApprovalStatus: WarningLetterDraftLegalApprovalStatus.NONE,
    });
    expect(blockers.some((b) => b.includes("נוסח המכתב"))).toBe(true);
  });

  it("blocks finalization for stale draft load state", () => {
    const blockers = collectWarningLetterFinalizationBlockersHe({
      ...readyGateBase,
      operativeDeadlinePolicyConfirmed: true,
      loadState: WarningLetterDraftLoadState.ACTIVE_STALE,
    });
    expect(blockers.some((b) => b.includes("טיוטה פעילה"))).toBe(true);
  });

  it("blocks finalization when operative snapshot still has payment link placeholder", () => {
    const blockers = collectWarningLetterFinalizationBlockersHe({
      ...readyGateBase,
      operativeDeadlinePolicyConfirmed: true,
      operativeSnapshotForFinalize: {
        paymentLinkPlaceholder: "[לינק]",
        previewWarningHe: null,
        numberedClauses: [{ clauseId: "pay", body: "שלם כאן" }],
      } as never,
    });
    expect(blockers.some((b) => b.includes("קישור תשלום") || b.includes("מציין"))).toBe(true);
  });

  it("does not mention payment collection integration as a finalize blocker", () => {
    const blockers = collectWarningLetterFinalizationBlockersHe({
      ...readyGateBase,
      operativeDeadlinePolicyConfirmed: true,
      operativeSnapshotForFinalize: {
        paymentLinkPlaceholder: "bank",
        previewWarningHe: null,
        numberedClauses: [{ clauseId: "a", body: "נוסח סופי" }],
      } as never,
    });
    expect(blockers.some((b) => b.includes("אינטגרציית תשלום"))).toBe(false);
  });
});