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
import type { DebtCaseRecord } from "@/modules/debt-cases/domain/debt-case-record.types";
import { AmountsMonetaryBasis } from "@/modules/financial-settings/domain/amounts-monetary-basis";
import type { PublishedFinancialSettingsVersion } from "@/modules/financial-settings/domain/published-financial-settings-version";
import { CourtCostsPolicy } from "@/modules/financial-settings/domain/court-costs-policy";
import { EscalationCalculationBase } from "@/modules/financial-settings/domain/escalation-calculation-base";
import { WarningLetterClientPresentation } from "@/modules/warning-letters/domain/warning-letter-client-presentation";
import {
  WarningLetterError,
  WarningLetterErrorCode,
} from "@/modules/warning-letters/domain/warning-letter-errors";
import {
  buildInitialWarningLetterPreviewSnapshot,
  buildStrictOperativeInitialWarningLetterSnapshot,
} from "@/modules/warning-letters/snapshot/build-warning-letter-snapshot";
import { assertOperativeWarningLetterSnapshot } from "@/modules/warning-letters/snapshot/assert-operative-warning-letter-snapshot";
import { WARNING_LETTER_MONETARY_UNAVAILABLE_DISPLAY } from "@/modules/warning-letters/domain/warning-letter-monetary-completeness";
import type { WarningLetterSnapshotBuildInput } from "@/modules/warning-letters/snapshot/warning-letter-snapshot-input";
import { renderWarningLetterPreviewHtml } from "@/modules/warning-letters/render/render-warning-letter-html";
import { INITIAL_WARNING_TEMPLATE_VERSION_ID } from "@/modules/warning-letters/domain/warning-letter-type";

function baseParties(overrides?: Partial<DebtCasePartyStructure>): DebtCasePartyStructure {
  return {
    propertyOwners: [{ fullName: "ישראל ישראלי", identityDocumentType: null, identityNumber: null, mobileE164: "+972501234567", email: null }],
    occupancyType: DebtCaseOccupancyType.OWNER,
    legalDebtorDesignation: LegalDebtorDesignation.PROPERTY_OWNERS,
    tenant: null,
    postalAddress: null,
    ...overrides,
  };
}

function baseDebtCase(parties: DebtCasePartyStructure): DebtCaseRecord {
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
    parties,
  };
}

function publishedSettings(grossMinor: number): PublishedFinancialSettingsVersion {
  return {
    settingsVersionId: "fs-v1",
    versionNumber: 1,
    effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
    publishedAt: new Date("2026-01-01T00:00:00.000Z"),
    currency: "ILS",
    amounts: {
      amountsMonetaryBasis: AmountsMonetaryBasis.GROSS_INCLUSIVE_VAT,
      debtorTreatmentFee: {
        gross: { currency: "ILS", amountMinor: grossMinor },
        net: { currency: "ILS", amountMinor: Math.round(grossMinor / 1.18) },
        vat: { currency: "ILS", amountMinor: grossMinor - Math.round(grossMinor / 1.18) },
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

function buildInput(overrides: Partial<WarningLetterSnapshotBuildInput>): WarningLetterSnapshotBuildInput {
  return {
    debtCase: baseDebtCase(baseParties()),
    building: {
      street: "רחוב הדוגמה",
      houseNumber: "28",
      city: "עיר לדוגמה",
      clientPresentation: WarningLetterClientPresentation.MANAGEMENT_COMPANY,
      managementCompanyLegalName: 'חברת ניהול לדוגמה בע"מ',
      treatmentFeeEligible: true,
    },
    financialSettings: publishedSettings(32_700),
    letterDateIso: "2026-04-19",
    letterCaseReference: "WH-2026-000001",
    deliveryChannelLabel: "רשום/הודעת ווטסאפ",
    paymentLinkPlaceholder: "[test]",
    inquiriesMobileDisplay: "054-9001774",
    signatoryName: 'עו"ד צבי',
    barRegistrationNumber: "3901440190500",
    requireOperativeMonetaryData: true,
    ...overrides,
  };
}

describe("warning letter snapshot", () => {
  it("uses management company intro and mc maintenance clause", () => {
    const snapshot = buildStrictOperativeInitialWarningLetterSnapshot(buildInput({}));
    expect(snapshot.introductionParagraph).toContain("חברת הניהול");
    expect(snapshot.numberedClauses.some((c) => c.clauseId === "mc_maintenance_role")).toBe(true);
  });

  it("uses committee intro without mc maintenance clause", () => {
    const snapshot = buildStrictOperativeInitialWarningLetterSnapshot(
      buildInput({
        building: {
          street: "רחוב הדוגמה",
          houseNumber: "28",
          city: "עיר לדוגמה",
          clientPresentation: WarningLetterClientPresentation.COMMITTEE,
          managementCompanyLegalName: null,
          treatmentFeeEligible: false,
        },
      }),
    );
    expect(snapshot.introductionParagraph).toContain("ונציגות הבית המשותף");
    expect(snapshot.numberedClauses.some((c) => c.clauseId === "mc_maintenance_role")).toBe(false);
  });

  it("selects tenant occupancy clause", () => {
    const parties = baseParties({
      occupancyType: DebtCaseOccupancyType.TENANT,
      legalDebtorDesignation: LegalDebtorDesignation.TENANT,
      tenant: {
        fullName: "דני שוכר",
        identityDocumentType: null,
        identityNumber: null,
        mobileE164: "+972501111111",
        email: null,
      },
    });
    const snapshot = buildStrictOperativeInitialWarningLetterSnapshot(
      buildInput({ debtCase: baseDebtCase(parties) }),
    );
    expect(snapshot.numberedClauses[0]?.clauseId).toBe("occupancy_tenant");
    expect(snapshot.ownerCopyRecipients.length).toBeGreaterThan(0);
  });

  it("uses joint owner wording for two owners", () => {
    const parties = baseParties({
      propertyOwners: [
        { fullName: "אחד", identityDocumentType: null, identityNumber: null, mobileE164: "+972501111111", email: null },
        { fullName: "שניים", identityDocumentType: null, identityNumber: null, mobileE164: "+972502222222", email: null },
      ],
    });
    const snapshot = buildStrictOperativeInitialWarningLetterSnapshot(
      buildInput({ debtCase: baseDebtCase(parties) }),
    );
    expect(snapshot.debtorNamesLine).toBe("אחד שניים");
    expect(snapshot.numberedClauses[0]?.body).toContain("בבעלותכם המשותפת");
  });

  it("uses without-treatment payment block when building not eligible", () => {
    const snapshot = buildStrictOperativeInitialWarningLetterSnapshot(
      buildInput({
        building: {
          street: "רחוב הדוגמה",
          houseNumber: "28",
          city: "עיר לדוגמה",
          clientPresentation: WarningLetterClientPresentation.COMMITTEE,
          managementCompanyLegalName: null,
          treatmentFeeEligible: false,
        },
      }),
    );
    const payment = snapshot.numberedClauses.find((c) => c.clauseId === "payment_block");
    expect(payment?.body).toContain("(קרן החוב)");
    expect(payment?.body).not.toContain("הוצאות טיפול עו");
  });

  it("omits treatment clause when building not eligible", () => {
    const snapshot = buildStrictOperativeInitialWarningLetterSnapshot(
      buildInput({
        building: {
          street: "רחוב הדוגמה",
          houseNumber: "28",
          city: "עיר לדוגמה",
          clientPresentation: WarningLetterClientPresentation.COMMITTEE,
          managementCompanyLegalName: null,
          treatmentFeeEligible: false,
        },
      }),
    );
    expect(snapshot.numberedClauses.some((c) => c.clauseId === "treatment_expenses")).toBe(false);
    expect(snapshot.totalDueMinor).toBe(122_400);
  });

  it("computes gross-inclusive totals from settings not hardcoded 327", () => {
    const snapshot = buildStrictOperativeInitialWarningLetterSnapshot(
      buildInput({ financialSettings: publishedSettings(40_000) }),
    );
    expect(snapshot.treatmentFeeGrossDisplay).toBe("400 ₪");
    expect(snapshot.totalDisplay).toBe("1,624 ₪");
  });

  it("numbers clauses without gaps", () => {
    const snapshot = buildStrictOperativeInitialWarningLetterSnapshot(buildInput({}));
    const numbers = snapshot.numberedClauses.map((c) => c.displayNumber);
    expect(numbers).toEqual([...Array(numbers.length)].map((_, i) => i + 1));
  });

  it("is deterministic and does not mutate input", () => {
    const input = buildInput({});
    const inputClone = structuredClone(input);
    const a = buildStrictOperativeInitialWarningLetterSnapshot(input);
    const b = buildStrictOperativeInitialWarningLetterSnapshot(input);
    expect(a.contentSha256).toBe(b.contentSha256);
    expect(input).toEqual(inputClone);
  });

  it("throws when published settings missing gross fee but building eligible", () => {
    const broken = publishedSettings(32_700);
    broken.amounts.debtorTreatmentFee = undefined;
    expect(() =>
      buildStrictOperativeInitialWarningLetterSnapshot(
        buildInput({ financialSettings: broken }),
      ),
    ).toThrowError(
      expect.objectContaining({
        code: WarningLetterErrorCode.MISSING_TREATMENT_FEE_WHEN_ELIGIBLE,
      }),
    );
  });

  it("throws when debtor name missing", () => {
    const parties = baseParties({ propertyOwners: [] });
    expect(() =>
      buildStrictOperativeInitialWarningLetterSnapshot(
        buildInput({ debtCase: baseDebtCase(parties) }),
      ),
    ).toThrow(WarningLetterError);
  });

  it("renders preview banner and template version", () => {
    const snapshot = buildStrictOperativeInitialWarningLetterSnapshot(
      buildInput({ financialSettings: publishedSettings(40_000) }),
    );
    expect(snapshot.templateVersionId).toBe(INITIAL_WARNING_TEMPLATE_VERSION_ID);
    const html = renderWarningLetterPreviewHtml(snapshot);
    expect(html).toContain("טיוטה לתצוגה בלבד — לא נשלחה");
    expect(html).toContain("400 ₪");
  });

  describe("non-operative preview vs strict operative", () => {
    it("preview renders without published settings when treatment not eligible", () => {
      const snapshot = buildInitialWarningLetterPreviewSnapshot(
        buildInput({
          financialSettings: null,
          building: {
            street: "רחוב הדוגמה",
            houseNumber: "28",
            city: "עיר לדוגמה",
            clientPresentation: WarningLetterClientPresentation.COMMITTEE,
            managementCompanyLegalName: null,
            treatmentFeeEligible: false,
          },
        }),
      );
      expect(snapshot.isOperativeSnapshot).toBe(true);
      expect(snapshot.previewWarningHe).toContain("מועד אחרון מודפס");
      expect(snapshot.totalDueMinor).toBe(122_400);
      expect(renderWarningLetterPreviewHtml(snapshot)).toContain("טיוטה לתצוגה בלבד");
    });

    it("preview shows unavailable amounts when eligible but settings missing", () => {
      const snapshot = buildInitialWarningLetterPreviewSnapshot(
        buildInput({ financialSettings: null }),
      );
      expect(snapshot.isOperativeSnapshot).toBe(false);
      expect(snapshot.previewWarningHe).toContain("לא נמצאו הגדרות כספיות מפורסמות");
      expect(snapshot.totalDisplay).toBe(WARNING_LETTER_MONETARY_UNAVAILABLE_DISPLAY);
      expect(snapshot.treatmentFeeGrossDisplay).toBe(WARNING_LETTER_MONETARY_UNAVAILABLE_DISPLAY);
      expect(() => assertOperativeWarningLetterSnapshot(snapshot)).toThrow();
    });

    it("strict operative rejects missing published settings when treatment eligible", () => {
      expect(() =>
        buildStrictOperativeInitialWarningLetterSnapshot(
          buildInput({ financialSettings: null }),
        ),
      ).toThrowError(
        expect.objectContaining({
          code: WarningLetterErrorCode.MISSING_PUBLISHED_FINANCIAL_SETTINGS,
        }),
      );
    });

    it("operative snapshot passes assert when settings complete", () => {
      const snapshot = buildStrictOperativeInitialWarningLetterSnapshot(buildInput({}));
      expect(() => assertOperativeWarningLetterSnapshot(snapshot)).not.toThrow();
    });
  });
});
