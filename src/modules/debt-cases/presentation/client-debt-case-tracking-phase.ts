import { DebtCaseLawyerReviewStatus } from "@/modules/debt-cases/domain/debt-case-lawyer-review-status";
import { DebtCasePaymentStatus } from "@/modules/debt-cases/domain/debt-case-payment-status";
import { DebtCaseWorkflowStatus } from "@/modules/debt-cases/domain/debt-case-workflow-status";
import type { DebtCaseRecord } from "@/modules/debt-cases/domain/debt-case-record.types";
import { startOfDayJerusalem, todayJerusalemIso } from "@/shared/time/jerusalem-calendar";

export const ClientDebtCaseTrackingPhase = {
  LETTER_BEING_PREPARED: "letter_being_prepared",
  UNDER_LAWYER_REVIEW: "under_lawyer_review",
  LETTER_APPROVED: "letter_approved",
  LETTER_SENT: "letter_sent",
  AWAITING_RESPONSE: "awaiting_response",
  PAYMENT_REPORTED: "payment_reported",
} as const;

export type ClientDebtCaseTrackingPhase =
  (typeof ClientDebtCaseTrackingPhase)[keyof typeof ClientDebtCaseTrackingPhase];

export function formatClientDebtCaseTrackingPhaseHe(phase: ClientDebtCaseTrackingPhase): string {
  switch (phase) {
    case ClientDebtCaseTrackingPhase.LETTER_BEING_PREPARED:
      return "מכתב בהכנה";
    case ClientDebtCaseTrackingPhase.UNDER_LAWYER_REVIEW:
      return "בבדיקת עורך דין";
    case ClientDebtCaseTrackingPhase.LETTER_APPROVED:
      return "מכתב מאושר להכנה";
    case ClientDebtCaseTrackingPhase.LETTER_SENT:
      return "מכתב נשלח";
    case ClientDebtCaseTrackingPhase.AWAITING_RESPONSE:
      return "ממתין לתגובה";
    case ClientDebtCaseTrackingPhase.PAYMENT_REPORTED:
      return "תשלום דווח";
    default:
      return phase;
  }
}

export function resolveClientDebtCaseTrackingPhase(input: {
  record: DebtCaseRecord;
  printedDeadlineDateIso?: string | null;
}): ClientDebtCaseTrackingPhase {
  if (
    input.record.paymentStatus === DebtCasePaymentStatus.PARTIAL_REPORTED ||
    input.record.paymentStatus === DebtCasePaymentStatus.FULL_REPORTED
  ) {
    return ClientDebtCaseTrackingPhase.PAYMENT_REPORTED;
  }

  if (input.record.workflowStatus === DebtCaseWorkflowStatus.LETTER_SENT) {
    const deadline = input.printedDeadlineDateIso?.trim();
    if (deadline) {
      const today = startOfDayJerusalem(todayJerusalemIso());
      const deadlineStart = startOfDayJerusalem(deadline);
      if (today.getTime() > deadlineStart.getTime()) {
        return ClientDebtCaseTrackingPhase.AWAITING_RESPONSE;
      }
    }
    return ClientDebtCaseTrackingPhase.LETTER_SENT;
  }

  if (input.record.lawyerReviewStatus === DebtCaseLawyerReviewStatus.APPROVED_FOR_LETTER_PREP) {
    return ClientDebtCaseTrackingPhase.LETTER_APPROVED;
  }

  if (input.record.workflowStatus === DebtCaseWorkflowStatus.AWAITING_LAWYER_REVIEW) {
    return ClientDebtCaseTrackingPhase.UNDER_LAWYER_REVIEW;
  }

  return ClientDebtCaseTrackingPhase.LETTER_BEING_PREPARED;
}