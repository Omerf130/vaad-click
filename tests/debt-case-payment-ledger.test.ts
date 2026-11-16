import { describe, expect, it } from "vitest";

import { DebtCaseManualPaymentEntryType } from "@/modules/debt-cases/domain/debt-case-manual-payment-entry-type";
import { DebtCasePaymentStatus } from "@/modules/debt-cases/domain/debt-case-payment-status";
import { deriveDebtCasePaymentStatus } from "@/modules/debt-cases/domain/debt-case-payment-status-derive";
import {
  computeDebtCaseBalanceSummary,
  resolveLetterTotalDueMinor,
  wouldOverpayLedger,
} from "@/modules/debt-cases/domain/debt-case-payment-ledger.compute";
import {
  ClientDebtCaseTrackingPhase,
  resolveClientDebtCaseTrackingPhase,
} from "@/modules/debt-cases/presentation/client-debt-case-tracking-phase";
import { DebtCaseWorkflowStatus } from "@/modules/debt-cases/domain/debt-case-workflow-status";
import { DebtCaseLawyerReviewStatus } from "@/modules/debt-cases/domain/debt-case-lawyer-review-status";
import type { DebtCaseRecord } from "@/modules/debt-cases/domain/debt-case-record.types";

function minimalRecord(overrides: Partial<DebtCaseRecord>): DebtCaseRecord {
  const base: DebtCaseRecord = {
    debtCaseId: "dc-1",
    buildingId: "b-1",
    revision: 1,
    predecessorDebtCaseId: null,
    letterSentAtIso: "2026-01-01T00:00:00.000Z",
    caseResolutionKind: null,
    caseResolutionReasonHe: null,
    caseResolutionAtIso: null,
    validationFlags: [],
    createdByUserId: "u1",
    updatedByUserId: "u1",
    submittedAtIso: null,
    createdAtIso: "2026-01-01T00:00:00.000Z",
    updatedAtIso: "2026-01-01T00:00:00.000Z",
    parties: {
      propertyOwners: [
        {
          fullName: "A",
          identityDocumentType: null,
          identityNumber: null,
          mobileE164: "+972501234567",
          email: null,
        },
      ],
      occupancyType: "owner_occupied",
      legalDebtorDesignation: "property_owners",
      tenant: null,
      postalAddress: null,
    },
    apartmentNumberDisplay: "1",
    apartmentKeyNormalized: "1",
    debtType: "regular_vaad",
    specialAssessmentDescription: null,
    principalAmountMinor: 50_000,
    periodStartMonth: "2024-01",
    periodEndMonth: "2024-02",
    workflowStatus: DebtCaseWorkflowStatus.LETTER_SENT,
    lawyerReviewStatus: DebtCaseLawyerReviewStatus.APPROVED_FOR_LETTER_PREP,
    letterDeliveryStatus: "sent",
    paymentStatus: DebtCasePaymentStatus.NONE,
    legalHoldReasons: [],
    platformFeePreference: null,
    platformFeeAmountMinor: null,
    platformFeeCollectionStatus: null,
    platformFeeInternalNote: null,
    platformFeeStatusHistory: [],
  };
  return { ...base, ...overrides };
}

describe("debt case payment ledger compute", () => {
  it("prefers frozen final snapshot total over case principal", () => {
    expect(
      resolveLetterTotalDueMinor({
        finalSnapshotTotalDueMinor: 120_000,
        finalSnapshotPrincipalMinor: 80_000,
        casePrincipalMinor: 50_000,
      }),
    ).toBe(120_000);
  });

  it("computes outstanding balance and overpayment", () => {
    const summary = computeDebtCaseBalanceSummary({
      letterTotalDueMinor: 100_000,
      casePrincipalMinor: 50_000,
      entries: [
        { entryType: DebtCaseManualPaymentEntryType.PAYMENT, signedEffectMinor: 40_000 },
        { entryType: DebtCaseManualPaymentEntryType.PAYMENT, signedEffectMinor: 70_000 },
      ],
    });
    expect(summary.netReportedPaymentsMinor).toBe(110_000);
    expect(summary.outstandingBalanceMinor).toBe(0);
    expect(summary.overpaymentMinor).toBe(10_000);
  });

  it("detects overpay before recording", () => {
    expect(
      wouldOverpayLedger({
        letterTotalDueMinor: 100_000,
        entries: [{ entryType: "payment", signedEffectMinor: 90_000 }],
        additionalPaymentMinor: 20_000,
      }),
    ).toBe(true);
  });

  it("derives payment status without implying workflow closure", () => {
    expect(
      deriveDebtCasePaymentStatus({
        netReportedPaymentsMinor: 0,
        outstandingBalanceMinor: 100_000,
      }),
    ).toBe(DebtCasePaymentStatus.NONE);
    expect(
      deriveDebtCasePaymentStatus({
        netReportedPaymentsMinor: 50_000,
        outstandingBalanceMinor: 50_000,
      }),
    ).toBe(DebtCasePaymentStatus.PARTIAL_REPORTED);
    expect(
      deriveDebtCasePaymentStatus({
        netReportedPaymentsMinor: 100_000,
        outstandingBalanceMinor: 0,
      }),
    ).toBe(DebtCasePaymentStatus.FULL_REPORTED);
  });

  it("maps client tracking to payment_reported when payments documented", () => {
    const phase = resolveClientDebtCaseTrackingPhase({
      record: minimalRecord({ paymentStatus: DebtCasePaymentStatus.PARTIAL_REPORTED }),
    });
    expect(phase).toBe(ClientDebtCaseTrackingPhase.PAYMENT_REPORTED);
  });
});