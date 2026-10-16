import "server-only";

import type { BuildingLegalReadinessResult } from "@/modules/debt-cases/domain/debt-case-legal-readiness";
import { DebtCaseLegalHoldReason } from "@/modules/debt-cases/domain/debt-case-legal-hold-reason";
import { formatLegalHoldReasonHe } from "@/modules/debt-cases/presentation/debt-case-labels.he";
import type { DebtCaseRecord } from "@/modules/debt-cases/domain/debt-case-record.types";
import { DebtCaseLawyerReviewStatus } from "@/modules/debt-cases/domain/debt-case-lawyer-review-status";
import { WarningLetterDraftLoadState } from "@/modules/warning-letters/domain/warning-letter-draft-load-state";
import { WarningLetterDraftLegalApprovalStatus } from "@/modules/warning-letters/domain/warning-letter-draft-legal-approval-status";
import { formatUnapprovedTemplateVariantHe } from "@/modules/warning-letters/presentation/warning-letter-approval-blockers.he";
import type { WarningLetterDraftView } from "@/modules/warning-letters/services/warning-letter-draft.service";

export type WarningLetterApprovalGateInput = {
  debtCase: DebtCaseRecord;
  legalReadiness: BuildingLegalReadinessResult;
  loadState: WarningLetterDraftLoadState;
  draft: WarningLetterDraftView | null;
  legalWordingApprovalStatus: WarningLetterDraftLegalApprovalStatus;
};

export function collectWarningLetterWordingApprovalBlockersHe(
  input: WarningLetterApprovalGateInput,
): string[] {
  const blockers: string[] = [];

  if (input.debtCase.lawyerReviewStatus !== DebtCaseLawyerReviewStatus.APPROVED_FOR_LETTER_PREP) {
    blockers.push("התיק אינו מאושר להכנת מכתב.");
  }

  if (input.loadState !== WarningLetterDraftLoadState.ACTIVE_CURRENT || !input.draft) {
    blockers.push("יש לסנכרן טיוטה פעילה מעודכנת לפני אישור הנוסח.");
  }

  if (
    input.legalWordingApprovalStatus === WarningLetterDraftLegalApprovalStatus.APPROVED
  ) {
    blockers.push("נוסח המכתב כבר אושר בגרסה זו.");
  }

  if (
    input.legalWordingApprovalStatus ===
    WarningLetterDraftLegalApprovalStatus.RETURNED_FOR_CORRECTION
  ) {
    blockers.push("הטיוטה הוחזרה לתיקון — יש ליצור גרסה חדשה לפני אישור מחדש.");
  }

  if (input.draft && !input.draft.approvalReady) {
    if (!input.draft.snapshot.isOperativeSnapshot) {
      blockers.push("הטיוטה אינה שלמה — חסרים נתונים כספיים או תצוגה.");
    }
    for (const variantId of input.draft.unapprovedTemplateVariantIds) {
      blockers.push(formatUnapprovedTemplateVariantHe(variantId));
    }
  }

  if (!input.legalReadiness.legalTreatmentAllowed) {
    for (const reason of input.legalReadiness.holdReasons) {
      blockers.push(formatLegalHoldReasonHe(reason));
    }
    if (input.legalReadiness.holdReasons.includes(DebtCaseLegalHoldReason.POA_NOT_SIGNED)) {
      blockers.push(
        "חסר תהליך חתימה/הצהרה מלא — אישור נוסח המכתב חסום עד להשלמת CP חתימות.",
      );
    }
    if (input.legalReadiness.holdReasons.includes(DebtCaseLegalHoldReason.ENGAGEMENT_NOT_SIGNED)) {
      blockers.push("טיוטת הסכם ניהול/ייפוי כוח טרם נחתמה — אישור נוסח חסום.");
    }
  }

  return blockers;
}
