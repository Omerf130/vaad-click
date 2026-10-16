import { describe, expect, it, vi } from "vitest";

import { DebtCaseLawyerReviewStatus } from "@/modules/debt-cases/domain/debt-case-lawyer-review-status";
import { DebtCaseLegalHoldReason } from "@/modules/debt-cases/domain/debt-case-legal-hold-reason";
import { LawyerVerificationStatus } from "@/modules/buildings/domain/building-status";
import { evaluateBuildingLegalReadiness } from "@/modules/debt-cases/domain/debt-case-legal-readiness";
import { sanitizeLawyerClauseOverrideText } from "@/modules/warning-letters/domain/sanitize-lawyer-clause-text";
import { WarningLetterDraftLoadState } from "@/modules/warning-letters/domain/warning-letter-draft-load-state";
import { WarningLetterDraftLegalApprovalStatus } from "@/modules/warning-letters/domain/warning-letter-draft-legal-approval-status";
import { WarningLetterUnapprovedTemplateVariant } from "@/modules/warning-letters/domain/warning-letter-unapproved-template-variant";
import { applyManualClauseOverridesToSnapshot } from "@/modules/warning-letters/snapshot/apply-clause-overrides-to-snapshot";
import { WarningLetterType } from "@/modules/warning-letters/domain/warning-letter-type";
import { WarningLetterMonetaryCompleteness } from "@/modules/warning-letters/domain/warning-letter-monetary-completeness";
import { WarningLetterClientPresentation } from "@/modules/warning-letters/domain/warning-letter-client-presentation";
import { collectWarningLetterWordingApprovalBlockersHe } from "@/modules/warning-letters/services/warning-letter-draft-approval-gates";
import type { WarningLetterDraftView } from "@/modules/warning-letters/services/warning-letter-draft.service";

function minimalSnapshot() {
  return {
    letterType: WarningLetterType.INITIAL_WARNING,
    templateVersionId: "initial_warning_he_v1",
    letterCaseReference: "WH-2026-000001",
    letterDateIso: "2026-04-19",
    printedDeadlineDateIso: "2026-04-29",
    clientPresentation: WarningLetterClientPresentation.COMMITTEE,
    deliveryChannelLabel: "x",
    subjectLine: "s",
    introductionParagraph: "intro",
    addresseeLines: ["לכבוד:"],
    apartmentAddressLine: "addr",
    debtorNamesLine: "debtor",
    debtMonthsCount: 2,
    settingsVersionId: null,
    monetaryCompleteness: WarningLetterMonetaryCompleteness.PRINCIPAL_ONLY,
    isOperativeSnapshot: true,
    previewWarningHe: null,
    principalAmountMinor: 120_000,
    totalDueMinor: 120_000,
    principalDisplay: "1,200.00 ₪",
    totalDisplay: "1,200.00 ₪",
    treatmentFeeGrossDisplay: null,
    totalWithTreatmentDisplay: null,
    treatmentDisplayClause: "",
    paymentLinkPlaceholder: "[link]",
    printedDeadlineDateDisplay: "29.4.26",
    numberedClauses: [
      {
        clauseId: "lawsuit_threat" as const,
        displayNumber: 5,
        body: "original lawsuit text",
      },
    ],
    evidenceDisclaimer: "e",
    inquiriesMobileDisplay: "m",
    signatoryName: "s",
    barRegistrationNumber: "b",
    recipients: [],
    ownerCopyRecipients: [],
    contentSha256: "abc",
    snapshotCreatedAtIso: "2026-04-19T00:00:00.000Z",
  };
}

describe("CP8.4C.2 clause sanitization", () => {
  it("rejects HTML and script patterns", () => {
    expect(sanitizeLawyerClauseOverrideText("<script>alert(1)</script>").ok).toBe(false);
    expect(sanitizeLawyerClauseOverrideText('text with {paymentLinkPlaceholder}').ok).toBe(false);
  });

  it("accepts plain Hebrew legal text", () => {
    const result = sanitizeLawyerClauseOverrideText("נוסח חריג מאושר לתיק זה.");
    expect(result.ok).toBe(true);
  });
});

describe("CP8.4C.2 snapshot overrides", () => {
  it("changes content hash without changing principal fields", () => {
    const snapshot = minimalSnapshot();
    const updated = applyManualClauseOverridesToSnapshot({
      snapshot,
      overrides: { lawsuit_threat: "נוסח משפטי מעודכן לתיק." },
    });
    expect(updated.numberedClauses[0]?.body).toContain("מעודכן");
    expect(updated.principalAmountMinor).toBe(120_000);
    expect(updated.contentSha256).not.toBe(snapshot.contentSha256);
  });
});

describe("CP8.4C.2 approval gates", () => {
  const debtCase = {
    lawyerReviewStatus: DebtCaseLawyerReviewStatus.APPROVED_FOR_LETTER_PREP,
  } as WarningLetterDraftView["debtCaseId"] extends string ? { lawyerReviewStatus: DebtCaseLawyerReviewStatus } : never;

  const draftBase: WarningLetterDraftView = {
    draftId: "d1",
    debtCaseId: "c1",
    buildingId: "b1",
    letterType: WarningLetterType.INITIAL_WARNING,
    templateVersionId: "initial_warning_he_v1",
    draftRevision: 1,
    priorDraftId: null,
    letterCaseReference: "WH-2026-000001",
    status: "active" as const,
    contentSha256: "hash",
    unapprovedTemplateVariantIds: [WarningLetterUnapprovedTemplateVariant.COMMITTEE_INTRO],
    approvalReady: false,
    invalidationReason: null,
    invalidatedAtIso: null,
    createdAtIso: "2026-01-01T00:00:00.000Z",
    updatedAtIso: "2026-01-01T00:00:00.000Z",
    snapshot: minimalSnapshot(),
    html: "<p>x</p>",
    previewWarningHe: null,
    isCurrentForCase: true,
    manuallyEdited: false,
    editedClauseIds: [],
    concurrencyRevision: 1,
    legalWordingApprovalStatus: WarningLetterDraftLegalApprovalStatus.NONE,
    legalWordingApprovedAtIso: null,
    editableClauses: [],
  };

  it("blocks approval for stale drafts and unapproved variants", () => {
    const readiness = evaluateBuildingLegalReadiness({
      lawyerVerificationStatus: LawyerVerificationStatus.VERIFIED,
      engagementSigned: false,
      poaSigned: false,
      legacyFastTrackEligible: false,
    });

    const staleBlockers = collectWarningLetterWordingApprovalBlockersHe({
      debtCase: debtCase as never,
      legalReadiness: readiness,
      loadState: WarningLetterDraftLoadState.ACTIVE_STALE,
      draft: draftBase,
      legalWordingApprovalStatus: WarningLetterDraftLegalApprovalStatus.NONE,
    });
    expect(staleBlockers.some((b) => b.includes("לסנכרן"))).toBe(true);

    const variantBlockers = collectWarningLetterWordingApprovalBlockersHe({
      debtCase: debtCase as never,
      legalReadiness: readiness,
      loadState: WarningLetterDraftLoadState.ACTIVE_CURRENT,
      draft: draftBase,
      legalWordingApprovalStatus: WarningLetterDraftLegalApprovalStatus.NONE,
    });
    expect(variantBlockers.length).toBeGreaterThan(0);
    expect(readiness.holdReasons).toContain(DebtCaseLegalHoldReason.ENGAGEMENT_NOT_SIGNED);
  });
});

describe("CP8.4C.2 lawyer-only edit authorization", () => {
  it("denies building rep at service boundary", async () => {
    vi.resetModules();
    vi.doMock("@/modules/debt-cases/services/debt-case-authorization.service", () => ({
      assertLawyerAdminDebtCaseReview: vi.fn().mockRejectedValue(new Error("forbidden")),
    }));
    vi.doMock("@/shared/db/connect", () => ({
      connectMongo: vi.fn().mockResolvedValue(undefined),
    }));
    const { saveWarningLetterDraftClauseEdits } = await import(
      "@/modules/warning-letters/services/warning-letter-draft-edit.service"
    );
    await expect(
      saveWarningLetterDraftClauseEdits({
        context: { user: { id: "u1" } } as never,
        debtCaseId: "c1",
        sourceDraftId: "d1",
        expectedConcurrencyRevision: 1,
        clauseOverrides: { lawsuit_threat: "x" },
      }),
    ).rejects.toThrow("forbidden");
  });
});
