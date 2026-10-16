import { describe, expect, it, vi } from "vitest";

import { DebtCaseDebtType } from "@/modules/debt-cases/domain/debt-case-debt-type";
import { DebtCaseLawyerReviewStatus } from "@/modules/debt-cases/domain/debt-case-lawyer-review-status";
import { DebtCaseLetterDeliveryStatus } from "@/modules/debt-cases/domain/debt-case-letter-delivery-status";
import { DebtCaseOccupancyType } from "@/modules/debt-cases/domain/debt-case-occupancy-type";
import { DebtCasePaymentStatus } from "@/modules/debt-cases/domain/debt-case-payment-status";
import { DebtCaseWorkflowStatus } from "@/modules/debt-cases/domain/debt-case-workflow-status";
import { LegalDebtorDesignation } from "@/modules/debt-cases/domain/debt-case-parties";
import type { DebtCaseRecord } from "@/modules/debt-cases/domain/debt-case-record.types";
import { formatLetterCaseReference } from "@/modules/warning-letters/domain/format-letter-case-reference";
import { WarningLetterClientPresentation } from "@/modules/warning-letters/domain/warning-letter-client-presentation";
import { WarningLetterDraftInvalidationReason } from "@/modules/warning-letters/domain/warning-letter-draft-invalidation-reason";
import {
  collectUnapprovedTemplateVariantIds,
  isWarningLetterDraftApprovalReady,
  WarningLetterUnapprovedTemplateVariant,
} from "@/modules/warning-letters/domain/warning-letter-unapproved-template-variant";
import { renderWarningLetterPreviewHtml } from "@/modules/warning-letters/render/render-warning-letter-html";
import {
  buildWarningLetterMaterialInputs,
  computeWarningLetterMaterialInputsSha256,
} from "@/modules/warning-letters/snapshot/warning-letter-material-input";

function baseDebtCase(overrides?: Partial<DebtCaseRecord>): DebtCaseRecord {
  return {
    debtCaseId: "internal-uuid-case",
    buildingId: "b1",
    revision: 1,
    predecessorDebtCaseId: null,
    letterSentAtIso: null,
    validationFlags: [],
    createdByUserId: "u1",
    updatedByUserId: "u1",
    submittedAtIso: null,
    createdAtIso: "2026-01-01T00:00:00.000Z",
    updatedAtIso: "2026-01-01T00:00:00.000Z",
    apartmentNumberDisplay: "3",
    apartmentKeyNormalized: "3",
    debtType: DebtCaseDebtType.REGULAR_VAAD,
    specialAssessmentDescription: null,
    principalAmountMinor: 50_000,
    periodStartMonth: "2026-01",
    periodEndMonth: "2026-02",
    workflowStatus: DebtCaseWorkflowStatus.AWAITING_LAWYER_REVIEW,
    lawyerReviewStatus: DebtCaseLawyerReviewStatus.APPROVED_FOR_LETTER_PREP,
    letterDeliveryStatus: DebtCaseLetterDeliveryStatus.NONE,
    paymentStatus: DebtCasePaymentStatus.NONE,
    legalHoldReasons: [],
    parties: {
      propertyOwners: [
        {
          fullName: "Test Owner",
          identityDocumentType: null,
          identityNumber: null,
          mobileE164: "+972501234567",
          email: null,
        },
      ],
      occupancyType: DebtCaseOccupancyType.OWNER,
      legalDebtorDesignation: LegalDebtorDesignation.PROPERTY_OWNERS,
      tenant: null,
      postalAddress: null,
    },
    ...overrides,
  };
}

describe("formatLetterCaseReference", () => {
  it("formats year and padded sequence", () => {
    expect(formatLetterCaseReference(2026, 1)).toBe("WH-2026-000001");
    expect(formatLetterCaseReference(2026, 42)).toBe("WH-2026-000042");
  });
});

describe("warning letter material inputs", () => {
  it("changes hash when principal changes", () => {
    const building = {
      street: "A",
      houseNumber: "1",
      city: "C",
      clientPresentation: WarningLetterClientPresentation.COMMITTEE,
      managementCompanyLegalName: null,
      treatmentFeeEligible: false,
    };
    const a = computeWarningLetterMaterialInputsSha256(
      buildWarningLetterMaterialInputs({
        debtCase: baseDebtCase(),
        building,
        settingsVersionId: null,
      }),
    );
    const b = computeWarningLetterMaterialInputsSha256(
      buildWarningLetterMaterialInputs({
        debtCase: baseDebtCase({ principalAmountMinor: 51_000 }),
        building,
        settingsVersionId: null,
      }),
    );
    expect(a).not.toBe(b);
  });

  it("does not change hash when unrelated workflow metadata differs", () => {
    const building = {
      street: "A",
      houseNumber: "1",
      city: "C",
      clientPresentation: WarningLetterClientPresentation.COMMITTEE,
      managementCompanyLegalName: null,
      treatmentFeeEligible: false,
    };
    const a = computeWarningLetterMaterialInputsSha256(
      buildWarningLetterMaterialInputs({
        debtCase: baseDebtCase({ revision: 1 }),
        building,
        settingsVersionId: null,
      }),
    );
    const b = computeWarningLetterMaterialInputsSha256(
      buildWarningLetterMaterialInputs({
        debtCase: baseDebtCase({ revision: 99 }),
        building,
        settingsVersionId: null,
      }),
    );
    expect(a).toBe(b);
  });
});

describe("unapproved template variants", () => {
  it("blocks approval readiness while variants are tracked", () => {
    const ids = collectUnapprovedTemplateVariantIds({
      clientPresentation: WarningLetterClientPresentation.COMMITTEE,
      includeTreatmentExpenses: false,
    });
    expect(ids).toContain(WarningLetterUnapprovedTemplateVariant.COMMITTEE_INTRO);
    expect(ids).toContain(WarningLetterUnapprovedTemplateVariant.PRINTED_DEADLINE_WITHOUT_TREATMENT);
    expect(
      isWarningLetterDraftApprovalReady({
        isOperativeSnapshot: true,
        unapprovedTemplateVariantIds: ids,
      }),
    ).toBe(false);
  });

  it("allows approval readiness only when operative and no unapproved variants", () => {
    expect(
      isWarningLetterDraftApprovalReady({
        isOperativeSnapshot: false,
        unapprovedTemplateVariantIds: [],
      }),
    ).toBe(false);
    expect(
      isWarningLetterDraftApprovalReady({
        isOperativeSnapshot: true,
        unapprovedTemplateVariantIds: [],
      }),
    ).toBe(true);
  });
});

describe("letter HTML case reference", () => {
  it("renders human reference instead of internal debt case id", () => {
    const html = renderWarningLetterPreviewHtml({
      letterType: "initial_warning",
      templateVersionId: "initial_warning_he_v1",
      letterCaseReference: "WH-2026-000099",
      letterDateIso: "2026-04-19",
      printedDeadlineDateIso: "2026-04-29",
      clientPresentation: WarningLetterClientPresentation.COMMITTEE,
      deliveryChannelLabel: "x",
      subjectLine: "subject",
      introductionParagraph: "intro",
      addresseeLines: ["לכבוד:"],
      apartmentAddressLine: "addr",
      debtorNamesLine: "name",
      debtMonthsCount: 1,
      settingsVersionId: null,
      monetaryCompleteness: "principal_only",
      isOperativeSnapshot: true,
      previewWarningHe: null,
      principalAmountMinor: 100,
      totalDueMinor: 100,
      principalDisplay: "1",
      totalDisplay: "1",
      treatmentFeeGrossDisplay: null,
      totalWithTreatmentDisplay: null,
      treatmentDisplayClause: "",
      paymentLinkPlaceholder: "p",
      printedDeadlineDateDisplay: "d",
      numberedClauses: [],
      evidenceDisclaimer: "e",
      inquiriesMobileDisplay: "m",
      signatoryName: "s",
      barRegistrationNumber: "b",
      recipients: [],
      ownerCopyRecipients: [],
      contentSha256: "abc",
      snapshotCreatedAtIso: "2026-04-19T00:00:00.000Z",
    });
    expect(html).toContain("WH-2026-000099");
    expect(html).not.toContain("internal-uuid-case");
  });
});

describe("lawyer-only draft access", () => {
  it("rejects non-lawyer context when loading persisted draft", async () => {
    vi.resetModules();
    vi.doMock("@/modules/debt-cases/services/debt-case-authorization.service", () => ({
      assertLawyerAdminDebtCaseReview: vi.fn().mockRejectedValue(new Error("forbidden")),
    }));
    vi.doMock("@/shared/db/connect", () => ({
      connectMongo: vi.fn().mockResolvedValue(undefined),
    }));
    const { getCurrentWarningLetterDraftForDebtCase } = await import(
      "@/modules/warning-letters/services/warning-letter-draft.service"
    );
    await expect(
      getCurrentWarningLetterDraftForDebtCase({
        context: {
          user: {
            id: "u1",
            email: "rep@test.com",
            role: "building_rep" as import("@/modules/users/domain/user-role").UserRole,
            accountStatus: "active" as import("@/modules/users/domain/account-status").AccountStatus,
          },
        } as import("@/shared/auth/get-authenticated-context").AuthenticatedContext,
        debtCaseId: "c1",
      }),
    ).rejects.toThrow("forbidden");
  });
});

describe("warning letter draft status labels", () => {
  it("does not label stale active drafts as synchronized", async () => {
    const { formatWarningLetterDraftStatusHe } = await import(
      "@/modules/warning-letters/presentation/warning-letter-draft-messages.he"
    );
    const { WarningLetterDraftStatus } = await import(
      "@/modules/warning-letters/domain/warning-letter-draft-status"
    );
    expect(
      formatWarningLetterDraftStatusHe(WarningLetterDraftStatus.ACTIVE, {
        isCurrentForCase: false,
      }),
    ).toContain("לא מסונכרנת");
    expect(
      formatWarningLetterDraftStatusHe(WarningLetterDraftStatus.ACTIVE, {
        isCurrentForCase: true,
      }),
    ).toContain("מסונכרנת");
  });
});

describe("Mongo draft write errors", () => {
  it("maps duplicate letterCaseReference index to legacy_reference_unique_index", async () => {
    const { mapMongoDraftWriteError } = await import(
      "@/modules/warning-letters/services/warning-letter-draft.service"
    );
    expect(() =>
      mapMongoDraftWriteError({
        code: 11000,
        keyPattern: { letterCaseReference: 1 },
      }),
    ).toThrow(
      expect.objectContaining({ code: "legacy_reference_unique_index" }),
    );
  });
});

describe("invalidation reason taxonomy", () => {
  it("includes debt case material edit reason", () => {
    expect(WarningLetterDraftInvalidationReason.DEBT_CASE_MATERIAL_EDIT).toBe(
      "debt_case_material_edit",
    );
  });
});
