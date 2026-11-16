import { describe, expect, it } from "vitest";

import { DebtCaseWorkflowStatus } from "@/modules/debt-cases/domain/debt-case-workflow-status";
import { evaluateBuildingLegalReadiness } from "@/modules/debt-cases/domain/debt-case-legal-readiness";
import { LawyerVerificationStatus } from "@/modules/buildings/domain/building-status";
import { LegalDocumentTemplateOperativeStatus } from "@/modules/legal-document-templates/domain/legal-document-template-operative-status";
import {
  buildDebtorResponsesFingerprint,
  buildPaymentLedgerFingerprint,
  buildStatementOfClaimDraftMaterialInputs,
  computeStatementOfClaimDraftMaterialInputsSha256,
} from "@/modules/statement-of-claim-drafts/domain/statement-of-claim-draft-material-input";
import { collectStatementOfClaimDraftReadinessBlockersHe } from "@/modules/statement-of-claim-drafts/domain/statement-of-claim-draft-readiness";
import { StatementOfClaimDraftStatus } from "@/modules/statement-of-claim-drafts/domain/statement-of-claim-draft-status";
import {
  StatementOfClaimPlaceholderId,
  substituteStatementOfClaimFactualPlaceholders,
} from "@/modules/statement-of-claim-templates/domain/statement-of-claim-placeholder-registry";
import type { DebtCaseRecord } from "@/modules/debt-cases/domain/debt-case-record.types";

const minimalDebtCase = {
  debtCaseId: "dc-1",
  buildingId: "b-1",
  revision: 2,
  workflowStatus: DebtCaseWorkflowStatus.LETTER_SENT,
  principalAmountMinor: 100_00,
  periodStartMonth: "2024-01",
  periodEndMonth: "2024-06",
  parties: {
    legalDebtorDesignation: "tenant",
    occupancyType: "tenant_occupied",
    propertyOwners: [],
    tenant: {
      fullName: "Test Tenant",
      identityDocumentType: "national_id",
      identityNumber: "123",
      mobileE164: "+972500000000",
      email: null,
    },
    postalAddress: null,
  },
} as unknown as DebtCaseRecord;

describe("statement of claim draft readiness", () => {
  it("hard-blocks without final letter and allows dev warnings for POA", () => {
    const legalReadiness = evaluateBuildingLegalReadiness({
      lawyerVerificationStatus: LawyerVerificationStatus.VERIFIED,
      engagementSigned: true,
      poaSigned: false,
      legacyFastTrackEligible: false,
    });

    const result = collectStatementOfClaimDraftReadinessBlockersHe({
      authorized: true,
      debtCase: minimalDebtCase,
      buildingAddressPresent: true,
      debtorDesignationPresent: true,
      finalWarningLetterPresent: false,
      templateRevisionPresent: true,
      legalReadiness,
      hasDisputedResponse: false,
      hasDeliveryConfirmation: false,
      hasEvidenceAssets: false,
      lawyerControlledFieldsIncomplete: true,
    });

    expect(result.hardBlockersHe.some((line) => line.includes("מכתב התראה"))).toBe(true);
    expect(result.legalWarningsHe.some((line) => line.includes("ייפוי כוח"))).toBe(true);
  });

  it("warns on closed case and dispute without hard blocking dev draft", () => {
    const closedCase = {
      ...minimalDebtCase,
      workflowStatus: DebtCaseWorkflowStatus.CLOSED_MANUAL,
    };
    const result = collectStatementOfClaimDraftReadinessBlockersHe({
      authorized: true,
      debtCase: closedCase,
      buildingAddressPresent: true,
      debtorDesignationPresent: true,
      finalWarningLetterPresent: true,
      templateRevisionPresent: true,
      legalReadiness: evaluateBuildingLegalReadiness({
        lawyerVerificationStatus: LawyerVerificationStatus.VERIFIED,
        engagementSigned: true,
        poaSigned: true,
        legacyFastTrackEligible: false,
      }),
      hasDisputedResponse: true,
      hasDeliveryConfirmation: true,
      hasEvidenceAssets: true,
      lawyerControlledFieldsIncomplete: true,
    });

    expect(result.hardBlockersHe).toHaveLength(0);
    expect(result.legalWarningsHe.some((line) => line.includes("סגור"))).toBe(true);
    expect(result.legalWarningsHe.some((line) => line.includes("מחלוקת"))).toBe(true);
  });
});

describe("statement of claim factual substitution", () => {
  it("fills factual placeholders and keeps lawyer fields incomplete", () => {
    const text = `חייב: {{debtor_name}} · סכום תביעה: {{claim_amount_lawyer}}`;
    const { rendered, incompleteLawyerTokens } = substituteStatementOfClaimFactualPlaceholders(text, {
      [StatementOfClaimPlaceholderId.DEBTOR_NAME]: "ישראל ישראלי",
    });
    expect(rendered).toContain("ישראל ישראלי");
    expect(rendered).toContain("[להשלמת עורך דין]");
    expect(incompleteLawyerTokens).toContain("{{claim_amount_lawyer}}");
  });
});

describe("statement of claim material fingerprint", () => {
  it("changes when payments or template revision change", () => {
    const base = buildStatementOfClaimDraftMaterialInputs({
      debtCase: minimalDebtCase,
      warningLetterFinalDocumentId: "fin-1",
      warningLetterFinalContentSha256: "a".repeat(64),
      warningLetterMaterialInputsSha256: "b".repeat(64),
      templateRevisionId: "tpl-1",
      templateContentSha256: "c".repeat(64),
      paymentLedgerFingerprint: buildPaymentLedgerFingerprint([
        { paymentEntryId: "p1", entryType: "payment", signedEffectMinor: -5000 },
      ]),
      deliveryRecordsFingerprint: "d1",
      debtorResponsesFingerprint: buildDebtorResponsesFingerprint([]),
    });
    const sha1 = computeStatementOfClaimDraftMaterialInputsSha256(base);

    const updatedPayments = {
      ...base,
      paymentLedgerFingerprint: buildPaymentLedgerFingerprint([
        { paymentEntryId: "p1", entryType: "payment", signedEffectMinor: -6000 },
      ]),
    };
    const sha2 = computeStatementOfClaimDraftMaterialInputsSha256(updatedPayments);

    const updatedTemplate = { ...base, templateContentSha256: "e".repeat(64) };
    const sha3 = computeStatementOfClaimDraftMaterialInputsSha256(updatedTemplate);

    expect(sha1).not.toBe(sha2);
    expect(sha1).not.toBe(sha3);
  });
});

describe("development-only enforcement", () => {
  it("model status enum preserves revision history semantics", () => {
    expect(StatementOfClaimDraftStatus.ACTIVE).toBe("active");
    expect(StatementOfClaimDraftStatus.SUPERSEDED).toBe("superseded");
    expect(LegalDocumentTemplateOperativeStatus.DEVELOPMENT_ONLY).toBe("development_only");
  });
});