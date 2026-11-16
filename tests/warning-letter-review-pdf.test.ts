import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";
import { PDFParse } from "pdf-parse";

import { DebtCaseLawyerReviewStatus } from "@/modules/debt-cases/domain/debt-case-lawyer-review-status";
import { DebtCaseDebtType } from "@/modules/debt-cases/domain/debt-case-debt-type";
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
import { SessionAuthStage } from "@/modules/auth/domain/session-types";
import { WarningLetterClientPresentation } from "@/modules/warning-letters/domain/warning-letter-client-presentation";
import { adaptSnapshotForReviewPdf } from "@/modules/warning-letters/pdf/adapt-snapshot-for-review-pdf";
import { WARNING_LETTER_REVIEW_PDF_DEADLINE_PLACEHOLDER_HE } from "@/modules/warning-letters/pdf/warning-letter-pdf.constants";
import { renderWarningLetterReviewPrintHtmlDocument } from "@/modules/warning-letters/pdf/render/render-warning-letter-review-print-html";
import { launchWarningLetterChromiumBrowser } from "@/modules/warning-letters/pdf/warning-letter-chromium-pdf";
import { generateWarningLetterReviewPdfBuffer } from "@/modules/warning-letters/pdf/warning-letter-pdf.service";
import { isWarningLetterOperativeDeadlinePolicyResolved } from "@/modules/warning-letters/domain/warning-letter-operative-policy";
import { buildInitialWarningLetterPreviewSnapshot } from "@/modules/warning-letters/snapshot/build-warning-letter-snapshot";
import type { WarningLetterSnapshotBuildInput } from "@/modules/warning-letters/snapshot/warning-letter-snapshot-input";
import { LAWYER_OFFICE_LETTER_CONFIG } from "@/modules/warning-letters/config/lawyer-office-letter-config";

async function extractPdfText(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  await parser.destroy();
  return result.text;
}

function normalizePdfExtractedText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function publishedSettings(grossMinor: number): PublishedFinancialSettingsVersion {
  return {
    settingsVersionId: "fs-v1",
    versionNumber: 1,
    effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
    publishedAt: new Date("2026-01-01T00:00:00.000Z"),
    amounts: {
      amountsMonetaryBasis: AmountsMonetaryBasis.GROSS_INCLUSIVE_VAT,
      debtorTreatmentFeeGrossMinor: grossMinor,
      debtorTreatmentFeeNetMinor: null,
      debtorTreatmentFeeVatMinor: null,
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

function baseDebtCase(parties: DebtCasePartyStructure): DebtCaseRecord {
  return {
    debtCaseId: "11111111-1111-4111-8111-111111111111",
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
    apartmentNumberDisplay: "3",
    apartmentKeyNormalized: "3",
    debtType: DebtCaseDebtType.REGULAR_VAAD,
    specialAssessmentDescription: null,
    principalAmountMinor: 122_400,
    periodStartMonth: "2026-01",
    periodEndMonth: "2026-03",
    workflowStatus: DebtCaseWorkflowStatus.AWAITING_LAWYER_REVIEW,
    lawyerReviewStatus: DebtCaseLawyerReviewStatus.APPROVED_FOR_LETTER_PREP,
    letterDeliveryStatus: DebtCaseLetterDeliveryStatus.NONE,
    paymentStatus: DebtCasePaymentStatus.NONE,
    legalHoldReasons: [],
    ...emptyDebtCasePlatformFeeFields(),
    parties,
  };
}

function buildInput(overrides: Partial<WarningLetterSnapshotBuildInput>): WarningLetterSnapshotBuildInput {
  return {
    debtCase: baseDebtCase(baseParties()),
    building: {
      street: "רחוב הדוגמה",
      houseNumber: "28",
      city: "עיר לדוגמה",
      clientPresentation: WarningLetterClientPresentation.COMMITTEE,
      managementCompanyLegalName: null,
      treatmentFeeEligible: false,
    },
    financialSettings: publishedSettings(32_700),
    letterDateIso: "2026-04-19",
    letterCaseReference: "WH-2026-000042",
    deliveryChannelLabel: "רשום/הודעת ווטסאפ",
    paymentLinkPlaceholder: "[קישור תשלום — יופעל לאחר חיבור סליקה]",
    inquiriesMobileDisplay: LAWYER_OFFICE_LETTER_CONFIG.inquiriesMobileDisplay,
    signatoryName: LAWYER_OFFICE_LETTER_CONFIG.lawyerSignatoryName,
    barRegistrationNumber: LAWYER_OFFICE_LETTER_CONFIG.barRegistrationNumber,
    requireOperativeMonetaryData: false,
    ...overrides,
  };
}
import { AccountStatus } from "@/modules/users/domain/account-status";
import { UserRole } from "@/modules/users/domain/user-role";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import {
  respondWithWarningLetterReviewPdf,
  buildWarningLetterReviewPdfResponseHeaders,
} from "@/modules/warning-letters/services/warning-letter-review-pdf-route.service";
import { WarningLetterReviewPdfDisposition } from "@/modules/warning-letters/presentation/warning-letter-review-pdf-urls";
import {
  WARNING_LETTER_REVIEW_PDF_RESPONSE_HEADER,
  WARNING_LETTER_REVIEW_PDF_RESPONSE_HEADER_VALUE,
} from "@/modules/warning-letters/pdf/warning-letter-pdf.constants";
import { WarningLetterPdfErrorCode } from "@/modules/warning-letters/pdf/warning-letter-pdf.errors";

const mockGetDebtCase = vi.fn();
const mockDraftFindOne = vi.fn();
const mockAssertLawyer = vi.fn();
const mockConnectMongo = vi.fn();

vi.mock("@/shared/db/connect", () => ({
  connectMongo: () => mockConnectMongo(),
}));

vi.mock("@/modules/debt-cases/services/debt-case-authorization.service", () => ({
  assertLawyerAdminDebtCaseReview: (...args: unknown[]) => mockAssertLawyer(...args),
}));

vi.mock("@/modules/debt-cases/services/debt-case.service", () => ({
  getDebtCase: (...args: unknown[]) => mockGetDebtCase(...args),
}));

vi.mock("@/modules/warning-letters/infra/warning-letter-draft.model", () => ({
  WarningLetterDraft: {
    findOne: (...args: unknown[]) => mockDraftFindOne(...args),
  },
}));

function baseParties(): DebtCasePartyStructure {
  return {
    propertyOwners: [
      {
        fullName: "ישראל ישראלי",
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
  };
}

const lawyerContext: AuthenticatedContext = {
  user: {
    id: "507f1f77bcf86cd799439011",
    fullName: "Lawyer",
    email: "law@example.com",
    role: UserRole.LAWYER_ADMIN,
    accountStatus: AccountStatus.ACTIVE,
    clientApprovalStatus: null,
  },
  sessionId: "sess",
  authStage: SessionAuthStage.MFA_COMPLETE,
};

describe("adaptSnapshotForReviewPdf", () => {
  it("replaces printed deadline in clauses when operative policy is unresolved", () => {
    const snapshot = buildInitialWarningLetterPreviewSnapshot(buildInput({}));
    expect(isWarningLetterOperativeDeadlinePolicyResolved()).toBe(false);

    const adapted = adaptSnapshotForReviewPdf(snapshot);
    const lawsuitClause = adapted.numberedClauses.find((c) => c.clauseId === "printed_deadline_lawsuit");
    expect(lawsuitClause?.body).toContain(WARNING_LETTER_REVIEW_PDF_DEADLINE_PLACEHOLDER_HE);
    expect(lawsuitClause?.body).not.toContain(snapshot.printedDeadlineDateDisplay);

    const original = snapshot.numberedClauses.find((c) => c.clauseId === "printed_deadline_lawsuit");
    expect(original?.body).toContain(snapshot.printedDeadlineDateDisplay);
  });
});

describe("generateWarningLetterReviewPdfBuffer", () => {
  it("produces a Hebrew PDF with review banner and firm letterhead text", { timeout: 90_000 }, async () => {
    const snapshot = buildInitialWarningLetterPreviewSnapshot(buildInput({}));
    const buffer = await generateWarningLetterReviewPdfBuffer({
      snapshot,
      draftRevision: 2,
    });
    expect(buffer.length).toBeGreaterThan(500);

    const text = normalizePdfExtractedText(await extractPdfText(buffer));
    expect(text).toMatch(/משרד עו/u);
    expect(text).toMatch(/מסמך לבדיקה בלבד/u);
    expect(text).toContain(snapshot.letterCaseReference);
    expect(text).toContain("1,224");
  });

  it("includes management-company intro when client presentation is MC", async () => {
    const snapshot = buildInitialWarningLetterPreviewSnapshot(
      buildInput({
        building: {
          street: "רחוב הדוגמה",
          houseNumber: "28",
          city: "עיר לדוגמה",
          clientPresentation: WarningLetterClientPresentation.MANAGEMENT_COMPANY,
          managementCompanyLegalName: 'חברת ניהול לדוגמה בע"מ',
          treatmentFeeEligible: true,
        },
      }),
    );
    const buffer = await generateWarningLetterReviewPdfBuffer({ snapshot, draftRevision: 1 });
    const text = normalizePdfExtractedText(await extractPdfText(buffer));
    expect(text).toContain("חברת הניהול");
  });

  it("preserves clause numbering in body", async () => {
    const snapshot = buildInitialWarningLetterPreviewSnapshot(buildInput({}));
    const buffer = await generateWarningLetterReviewPdfBuffer({ snapshot, draftRevision: 1 });
    const text = await extractPdfText(buffer);
    const firstClause = snapshot.numberedClauses[0];
    expect(text).toMatch(new RegExp(`\\.${firstClause.displayNumber}\\b|${firstClause.displayNumber}\\.`));
  });

  it("labels bar registration number under signatory (not bare digits)", async () => {
    const snapshot = buildInitialWarningLetterPreviewSnapshot(buildInput({}));
    const buffer = await generateWarningLetterReviewPdfBuffer({ snapshot, draftRevision: 1 });
    const text = normalizePdfExtractedText(await extractPdfText(buffer));
    expect(text).toMatch(/בלשכת עורכי הדין/);
    expect(text).toContain(LAWYER_OFFICE_LETTER_CONFIG.barRegistrationNumber);
  });

  it("renders committee owner and management-company tenant variants with readable debt table labels", async () => {
    const tenantParties: DebtCasePartyStructure = {
      ...baseParties(),
      occupancyType: DebtCaseOccupancyType.TENANT,
      legalDebtorDesignation: LegalDebtorDesignation.TENANT,
      tenant: {
        fullName: "דני שוכר",
        identityDocumentType: null,
        identityNumber: null,
        mobileE164: "+972501111111",
        email: null,
      },
    };
    const mcTenantSnapshot = buildInitialWarningLetterPreviewSnapshot(
      buildInput({
        debtCase: baseDebtCase(tenantParties),
        building: {
          street: "רחוב הדוגמה",
          houseNumber: "28",
          city: "עיר לדוגמה",
          clientPresentation: WarningLetterClientPresentation.MANAGEMENT_COMPANY,
          managementCompanyLegalName: 'חברת ניהול לדוגמה בע"מ',
          treatmentFeeEligible: true,
        },
      }),
    );
    const buffer = await generateWarningLetterReviewPdfBuffer({ snapshot: mcTenantSnapshot, draftRevision: 1 });
    const text = await extractPdfText(buffer);
    const normalized = normalizePdfExtractedText(text);
    expect(normalized).toContain("דני שוכר");
    expect(normalized).toMatch(/חודשי פיגור/);
    expect(normalized).toMatch(/הוצאות טיפול/);
  });

  it("omits treatment fee clauses when building is ineligible", async () => {
    const snapshot = buildInitialWarningLetterPreviewSnapshot(buildInput({}));
    const buffer = await generateWarningLetterReviewPdfBuffer({ snapshot, draftRevision: 1 });
    const text = await extractPdfText(buffer);
    expect(snapshot.numberedClauses.some((c) => c.clauseId === "treatment_fee")).toBe(false);
    expect(text).not.toMatch(/327/);
  });

  it("spans multiple pages when content is long", async () => {
    const snapshot = buildInitialWarningLetterPreviewSnapshot(buildInput({}));
    const paddedSnapshot = {
      ...snapshot,
      introductionParagraph: `${snapshot.introductionParagraph}\n\n${"פסקת בדיקה לעמודים ארוכים. ".repeat(120)}`,
    };
    const buffer = await generateWarningLetterReviewPdfBuffer({
      snapshot: paddedSnapshot,
      draftRevision: 1,
    });
    const parser = new PDFParse({ data: buffer });
    const pdf = await parser.getText();
    await parser.destroy();
    expect(pdf.total).toBeGreaterThan(1);
  });

  it("writes representative review PDF samples when VAAD_DEV_WARNING_LETTER_PDF=1", async () => {
    if (process.env.VAAD_DEV_WARNING_LETTER_PDF !== "1") {
      return;
    }
    const scenarios: Array<{ name: string; input: Partial<WarningLetterSnapshotBuildInput> }> = [
      { name: "01-committee-owner", input: {} },
      {
        name: "02-mc-tenant-fee-eligible",
        input: {
          debtCase: baseDebtCase({
            ...baseParties(),
            occupancyType: DebtCaseOccupancyType.TENANT,
            legalDebtorDesignation: LegalDebtorDesignation.TENANT,
            tenant: {
              fullName: "דני שוכר",
              identityDocumentType: null,
              identityNumber: null,
              mobileE164: "+972501111111",
              email: null,
            },
          }),
          building: {
            street: "רחוב הדוגמה",
            houseNumber: "28",
            city: "עיר לדוגמה",
            clientPresentation: WarningLetterClientPresentation.MANAGEMENT_COMPANY,
            managementCompanyLegalName: 'חברת ניהול לדוגמה בע"מ',
            treatmentFeeEligible: true,
          },
        },
      },
      {
        name: "03-committee-owner-fee-ineligible",
        input: { building: { street: "א", houseNumber: "1", city: "חיפה", clientPresentation: WarningLetterClientPresentation.COMMITTEE, managementCompanyLegalName: null, treatmentFeeEligible: false } },
      },
      {
        name: "04-mixed-reference",
        input: { letterCaseReference: "WH-2026-MIXED-EN-77" },
      },
      {
        name: "05-long-multipage",
        input: {},
      },
    ];

    const outDir = join(tmpdir(), "vaad-click-warning-letter-review-samples");
    mkdirSync(outDir, { recursive: true });
    for (const scenario of scenarios) {
      let snapshot = buildInitialWarningLetterPreviewSnapshot(buildInput(scenario.input));
      if (scenario.name === "05-long-multipage") {
        snapshot = {
          ...snapshot,
          introductionParagraph: `${snapshot.introductionParagraph}\n\n${"פסקת בדיקה ארוכה. ".repeat(150)}`,
        };
      }
      const buffer = await generateWarningLetterReviewPdfBuffer({ snapshot, draftRevision: 2 });
      const outPath = join(outDir, `${scenario.name}.pdf`);
      writeFileSync(outPath, buffer);
      console.log(`Sample written: ${outPath}`);

      if (process.env.VAAD_DEV_WARNING_LETTER_VISUAL === "1") {
        const html = renderWarningLetterReviewPrintHtmlDocument({
          snapshot,
          draftRevision: 2,
          generatedAtIso: "2026-04-19T12:00:00.000Z",
        });
        const browser = await launchWarningLetterChromiumBrowser();
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: "domcontentloaded", timeout: 45_000 });
        await page.emulateMediaType("print");
        const pngPath = join(outDir, `${scenario.name}.png`);
        await page.screenshot({ path: pngPath, fullPage: true, type: "png" });
        await browser.close();
        console.log(`Visual screenshot written: ${pngPath}`);
      }
    }
    expect(true).toBe(true);
  }, 120_000);
});

describe("warning letter review PDF route", () => {
  beforeEach(() => {
    mockConnectMongo.mockResolvedValue(undefined);
    mockAssertLawyer.mockResolvedValue(undefined);
  });

  it("sets review-only response header", () => {
    const headers = buildWarningLetterReviewPdfResponseHeaders({
      disposition: WarningLetterReviewPdfDisposition.INLINE,
      filename: "test.pdf",
      byteLength: 100,
    });
    expect(headers.get(WARNING_LETTER_REVIEW_PDF_RESPONSE_HEADER)).toBe(
      WARNING_LETTER_REVIEW_PDF_RESPONSE_HEADER_VALUE,
    );
  });

  it("rejects non-lawyer roles", async () => {
    mockGetDebtCase.mockResolvedValue({
      lawyerReviewStatus: DebtCaseLawyerReviewStatus.APPROVED_FOR_LETTER_PREP,
    });
    const snapshot = buildInitialWarningLetterPreviewSnapshot(buildInput({}));
    mockDraftFindOne.mockReturnValue({
      lean: () =>
        Promise.resolve({
          contentSnapshot: snapshot,
          draftRevision: 1,
          letterCaseReference: snapshot.letterCaseReference,
        }),
    });

    await expect(
      respondWithWarningLetterReviewPdf({
        context: {
          ...lawyerContext,
          user: { ...lawyerContext.user, role: UserRole.BUILDING_REP },
        },
        debtCaseId: "11111111-1111-4111-8111-111111111111",
        draftId: "22222222-2222-4222-8222-222222222222",
        disposition: WarningLetterReviewPdfDisposition.INLINE,
      }),
    ).rejects.toMatchObject({ code: WarningLetterPdfErrorCode.FORBIDDEN });
  });

  it("returns PDF without mutating draft (read-only find)", async () => {
    const debtCaseId = "11111111-1111-4111-8111-111111111111";
    const draftId = "22222222-2222-4222-8222-222222222222";
    const snapshot = buildInitialWarningLetterPreviewSnapshot(buildInput({}));

    mockGetDebtCase.mockResolvedValue({
      lawyerReviewStatus: DebtCaseLawyerReviewStatus.APPROVED_FOR_LETTER_PREP,
    });
    mockDraftFindOne.mockReturnValue({
      lean: () =>
        Promise.resolve({
          contentSnapshot: snapshot,
          draftRevision: 3,
          letterCaseReference: snapshot.letterCaseReference,
        }),
    });

    const response = await respondWithWarningLetterReviewPdf({
      context: lawyerContext,
      debtCaseId,
      draftId,
      disposition: WarningLetterReviewPdfDisposition.ATTACHMENT,
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/pdf");
    expect(mockDraftFindOne).toHaveBeenCalledWith({ debtCaseId, draftId });
    const buf = Buffer.from(await response.arrayBuffer());
    expect(buf.subarray(0, 4).toString()).toBe("%PDF");
  });
});