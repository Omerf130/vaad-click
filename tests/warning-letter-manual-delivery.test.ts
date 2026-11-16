import { describe, expect, it } from "vitest";

import { DebtCaseLawyerReviewStatus } from "@/modules/debt-cases/domain/debt-case-lawyer-review-status";
import { DebtCaseWorkflowStatus } from "@/modules/debt-cases/domain/debt-case-workflow-status";
import {
  ClientDebtCaseTrackingPhase,
  resolveClientDebtCaseTrackingPhase,
} from "@/modules/debt-cases/presentation/client-debt-case-tracking-phase";
import { assertDebtCaseWorkflowTransition } from "@/modules/debt-cases/domain/debt-case-status-transitions";
import { AccountStatus } from "@/modules/users/domain/account-status";
import { UserRole } from "@/modules/users/domain/user-role";
import { WarningLetterFinalDocumentStatus } from "@/modules/warning-letters/domain/warning-letter-final-document-status";
import { WarningLetterDeliveryRecordStatus } from "@/modules/warning-letters/domain/warning-letter-delivery-record-status";
import {
  collectWarningLetterManualDeliveryBlockersHe,
  collectWarningLetterDispatchBlockersHe,
} from "@/modules/warning-letters/services/warning-letter-finalization-gates";
import { deliveryStatusTriggersCaseLetterSent } from "@/modules/warning-letters/domain/warning-letter-delivery-record-status";

const lawyerContext = { role: UserRole.LAWYER_ADMIN, accountStatus: AccountStatus.ACTIVE };

const approvedCase = {
  lawyerReviewStatus: DebtCaseLawyerReviewStatus.APPROVED_FOR_LETTER_PREP,
  workflowStatus: DebtCaseWorkflowStatus.AWAITING_LAWYER_REVIEW,
} as never;

const finalDoc = {
  finalDocumentId: "f1",
  status: WarningLetterFinalDocumentStatus.READY_FOR_DELIVERY,
  pdfAvailable: true,
} as never;

describe("manual delivery gates", () => {
  it("allows manual delivery when final PDF is ready", () => {
    const blockers = collectWarningLetterManualDeliveryBlockersHe({
      debtCase: approvedCase,
      finalDocument: finalDoc,
    });
    expect(blockers).toHaveLength(0);
  });

  it("blocks manual delivery without final document", () => {
    const blockers = collectWarningLetterManualDeliveryBlockersHe({
      debtCase: approvedCase,
      finalDocument: null,
    });
    expect(blockers.length).toBeGreaterThan(0);
  });

  it("still blocks automatic dispatch integration", () => {
    const blockers = collectWarningLetterDispatchBlockersHe({
      debtCase: approvedCase,
      legalReadiness: { legalTreatmentAllowed: true, holdReasons: [] } as never,
      loadState: "active_current" as never,
      draft: { approvalReady: true } as never,
      legalWordingApprovalStatus: "approved" as never,
      operativeDeadlinePolicyConfirmed: true,
      hasFinalDocument: true,
    });
    expect(blockers.some((b) => b.includes("אוטומטית"))).toBe(true);
  });
});

describe("delivery status vs case letter_sent", () => {
  it("only SENT triggers workflow transition", () => {
    expect(deliveryStatusTriggersCaseLetterSent(WarningLetterDeliveryRecordStatus.SENT)).toBe(true);
    expect(deliveryStatusTriggersCaseLetterSent(WarningLetterDeliveryRecordStatus.FAILED)).toBe(false);
    expect(deliveryStatusTriggersCaseLetterSent(WarningLetterDeliveryRecordStatus.ATTEMPTED)).toBe(false);
  });

  it("allows lawyer workflow transition to letter_sent", () => {
    expect(() =>
      assertDebtCaseWorkflowTransition({
        from: DebtCaseWorkflowStatus.AWAITING_LAWYER_REVIEW,
        to: DebtCaseWorkflowStatus.LETTER_SENT,
        context: lawyerContext,
      }),
    ).not.toThrow();
  });
});

describe("client tracking phase", () => {
  it("shows letter approved before send", () => {
    const phase = resolveClientDebtCaseTrackingPhase({
      record: {
        workflowStatus: DebtCaseWorkflowStatus.AWAITING_LAWYER_REVIEW,
        lawyerReviewStatus: DebtCaseLawyerReviewStatus.APPROVED_FOR_LETTER_PREP,
      } as never,
    });
    expect(phase).toBe(ClientDebtCaseTrackingPhase.LETTER_APPROVED);
  });

  it("shows letter sent after workflow update", () => {
    const phase = resolveClientDebtCaseTrackingPhase({
      record: {
        workflowStatus: DebtCaseWorkflowStatus.LETTER_SENT,
        lawyerReviewStatus: DebtCaseLawyerReviewStatus.APPROVED_FOR_LETTER_PREP,
      } as never,
      printedDeadlineDateIso: "2099-01-01",
    });
    expect(phase).toBe(ClientDebtCaseTrackingPhase.LETTER_SENT);
  });
});