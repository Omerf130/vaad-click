import { describe, expect, it } from "vitest";

import { DebtCaseDebtType } from "@/modules/debt-cases/domain/debt-case-debt-type";
import { DebtCaseLawyerReviewStatus } from "@/modules/debt-cases/domain/debt-case-lawyer-review-status";
import { DebtCaseLetterDeliveryStatus } from "@/modules/debt-cases/domain/debt-case-letter-delivery-status";
import { DebtCaseOccupancyType } from "@/modules/debt-cases/domain/debt-case-occupancy-type";
import { DebtCasePaymentStatus } from "@/modules/debt-cases/domain/debt-case-payment-status";
import { DebtCaseWorkflowStatus } from "@/modules/debt-cases/domain/debt-case-workflow-status";
import {
  LegalDebtorDesignation,
  type DebtCasePartyStructure,
} from "@/modules/debt-cases/domain/debt-case-parties";
import { emptyDebtCasePlatformFeeFields } from "@/modules/debt-cases/domain/debt-case-platform-fee.defaults";
import type { DebtCaseRecord } from "@/modules/debt-cases/domain/debt-case-record.types";
import { AmountsMonetaryBasis } from "@/modules/financial-settings/domain/amounts-monetary-basis";
import type { PublishedFinancialSettingsVersion } from "@/modules/financial-settings/domain/published-financial-settings-version";
import { CourtCostsPolicy } from "@/modules/financial-settings/domain/court-costs-policy";
import { EscalationCalculationBase } from "@/modules/financial-settings/domain/escalation-calculation-base";
import { WarningLetterClientPresentation } from "@/modules/warning-letters/domain/warning-letter-client-presentation";
import { WARNING_LETTER_REVIEW_PDF_BANNER_HE } from "@/modules/warning-letters/pdf/warning-letter-pdf.constants";
import { WarningLetterPdfRenderMode } from "@/modules/warning-letters/pdf/warning-letter-pdf-mode";
import { renderWarningLetterPrintHtmlDocument } from "@/modules/warning-letters/pdf/render/render-warning-letter-print-html";
import { WARNING_LETTER_PAYMENT_LINK_PREVIEW_PLACEHOLDER } from "@/modules/warning-letters/config/lawyer-office-letter-config";
import { applyFinalizationLetterDatesToSnapshot } from "@/modules/warning-letters/snapshot/apply-finalization-letter-dates";
import { buildStrictOperativeInitialWarningLetterSnapshot } from "@/modules/warning-letters/snapshot/build-warning-letter-snapshot";
import type { WarningLetterSnapshotBuildInput } from "@/modules/warning-letters/snapshot/warning-letter-snapshot-input";

function baseParties(): DebtCasePartyStructure {
  return {
    propertyOwners: [{ fullName: "ישראל ישראלי", identityDocumentType: null, identityNumber: null, mobileE164: "+972501234567", email: null }],
    occupancyType: DebtCaseOccupancyType.OWNER,
    legalDebtorDesignation: LegalDebtorDesignation.PROPERTY_OWNERS,
    tenant: null,
    postalAddress: null,
  };
}

function baseDebtCase(): DebtCaseRecord {
  return {
    debtCaseId: "case-001",
    buildingId: "b-1",
    revision: 2,
    predecessorDebtCaseId: null,
    letterSentAtIso: null,
    validationFlags: [],
    createdByUserId: "u1",
    updatedByUserId: "u1",
    submittedAtIso: "2026-04-01T10:00:00.000Z",
    createdAtIso: "2026-04-01T09:00:00.000Z",
    updatedAtIso: "2026-04-01T10:00:00.000Z",
    apartmentNumberDisplay: "1",
    apartmentKeyNormalized: "1",
    debtType: DebtCaseDebtType.REGULAR_VAAD,
    specialAssessmentDescription: null,
    principalAmountMinor: 122_400,
    periodStartMonth: "2026-01",
    periodEndMonth: "2026-04",
    workflowStatus: DebtCaseWorkflowStatus.AWAITING_LAWYER_REVIEW,
    lawyerReviewStatus: DebtCaseLawyerReviewStatus.APPROVED_FOR_LETTER_PREP,
    letterDeliveryStatus: DebtCaseLetterDeliveryStatus.NONE,
    paymentStatus: DebtCasePaymentStatus.NONE,
    legalHoldReasons: [],
    ...emptyDebtCasePlatformFeeFields(),
    parties: baseParties(),
  };
}

function publishedSettings(): PublishedFinancialSettingsVersion {
  return {
    settingsVersionId: "fs-v1",
    versionNumber: 1,
    effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
    publishedAt: new Date("2026-01-01T00:00:00.000Z"),
    currency: "ILS",
    amounts: {
      amountsMonetaryBasis: AmountsMonetaryBasis.GROSS_INCLUSIVE_VAT,
      debtorTreatmentFee: {
        gross: { currency: "ILS", amountMinor: 32_700 },
        net: { currency: "ILS", amountMinor: 27_712 },
        vat: { currency: "ILS", amountMinor: 4_988 },
      },
      committeeTreatmentFeeWhenDebtorWaived: {
        gross: { currency: "ILS", amountMinor: 23_600 },
        net: { currency: "ILS", amountMinor: 20_000 },
        vat: { currency: "ILS", amountMinor: 3_600 },
      },
    },
    vatSchedule: [],
    escalation: {
      recoveryFeeRateBasisPoints: 2000,
      calculationBase:
        EscalationCalculationBase.COLLECTED_PRINCIPAL_AND_INDEXATION_INTEREST_AFTER_LAWSUIT_FILED,
      courtCostsPolicy: CourtCostsPolicy.UNSPECIFIED,
    },
  };
}

function buildInput(): WarningLetterSnapshotBuildInput {
  return {
    debtCase: baseDebtCase(),
    building: {
      street: "רחוב הדוגמה",
      houseNumber: "28",
      city: "עיר לדוגמה",
      clientPresentation: WarningLetterClientPresentation.MANAGEMENT_COMPANY,
      managementCompanyLegalName: 'חברת ניהול לדוגמה בע"מ',
      treatmentFeeEligible: true,
    },
    financialSettings: publishedSettings(),
    letterDateIso: "2026-04-19",
    letterCaseReference: "WH-2026-000001",
    deliveryChannelLabel: "רשום/הודעת ווטסאפ",
    paymentLinkPlaceholder: "[test]",
    inquiriesMobileDisplay: "054-9001774",
    signatoryName: 'עו"ד צבי',
    barRegistrationNumber: "3901440190500",
    requireOperativeMonetaryData: true,
  };
}

function operativeSnapshotWithoutPaymentPlaceholder() {
  const snapshot = buildStrictOperativeInitialWarningLetterSnapshot(buildInput());
  const clauses = snapshot.numberedClauses.map((clause) =>
    clause.body.includes(WARNING_LETTER_PAYMENT_LINK_PREVIEW_PLACEHOLDER)
      ? { ...clause, body: clause.body.replace(WARNING_LETTER_PAYMENT_LINK_PREVIEW_PLACEHOLDER, "העברה בנקאית") }
      : clause,
  );
  return applyFinalizationLetterDatesToSnapshot(
    { ...snapshot, numberedClauses: clauses, paymentLinkPlaceholder: "bank-transfer" },
    "2026-06-01",
  );
}

describe("final warning letter print HTML", () => {
  it("omits review-only banner in FINAL mode", () => {
    const snapshot = operativeSnapshotWithoutPaymentPlaceholder();
    const reviewHtml = renderWarningLetterPrintHtmlDocument({
      snapshot,
      draftRevision: 3,
      mode: WarningLetterPdfRenderMode.REVIEW,
    });
    const finalHtml = renderWarningLetterPrintHtmlDocument({
      snapshot,
      draftRevision: 3,
      mode: WarningLetterPdfRenderMode.FINAL,
    });
    expect(reviewHtml).toContain(WARNING_LETTER_REVIEW_PDF_BANNER_HE);
    expect(finalHtml).not.toContain(WARNING_LETTER_REVIEW_PDF_BANNER_HE);
    expect(finalHtml).not.toContain("class=\"reviewBanner\"");
  });
});