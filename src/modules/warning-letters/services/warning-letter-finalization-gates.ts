import "server-only";

import type { BuildingLegalReadinessResult } from "@/modules/debt-cases/domain/debt-case-legal-readiness";
import type { DebtCaseRecord } from "@/modules/debt-cases/domain/debt-case-record.types";
import { DebtCaseLawyerReviewStatus } from "@/modules/debt-cases/domain/debt-case-lawyer-review-status";
import { DebtCaseWorkflowStatus } from "@/modules/debt-cases/domain/debt-case-workflow-status";
import { WarningLetterFinalDocumentStatus } from "@/modules/warning-letters/domain/warning-letter-final-document-status";
import type { WarningLetterFinalDocumentView } from "@/modules/warning-letters/services/warning-letter-finalization.service";
import { WarningLetterDraftLegalApprovalStatus } from "@/modules/warning-letters/domain/warning-letter-draft-legal-approval-status";
import { WarningLetterDraftLoadState } from "@/modules/warning-letters/domain/warning-letter-draft-load-state";
import { WARNING_LETTER_OPERATIVE_DEADLINE_POLICY_BLOCKED_HE } from "@/modules/warning-letters/domain/warning-letter-operative-deadline-policy";
import type { WarningLetterContentSnapshot } from "@/modules/warning-letters/snapshot/warning-letter-snapshot.types";
import { collectOperativeFinalSnapshotBlockersHe } from "@/modules/warning-letters/snapshot/collect-operative-finalization-blockers";
import { formatUnapprovedTemplateVariantHe } from "@/modules/warning-letters/presentation/warning-letter-approval-blockers.he";
import { formatLegalHoldReasonHe } from "@/modules/debt-cases/presentation/debt-case-labels.he";
import type { WarningLetterDraftView } from "@/modules/warning-letters/services/warning-letter-draft.service";
import { WARNING_LETTER_TEMPLATE_VARIANT_CATALOG } from "@/modules/warning-letters/domain/warning-letter-template-variant-catalog";

export type WarningLetterFinalizationGateInput = {
  debtCase: DebtCaseRecord;
  legalReadiness: BuildingLegalReadinessResult;
  loadState: WarningLetterDraftLoadState;
  draft: WarningLetterDraftView | null;
  legalWordingApprovalStatus: WarningLetterDraftLegalApprovalStatus;
  operativeDeadlinePolicyConfirmed: boolean;
  operativeSnapshotForFinalize?: WarningLetterContentSnapshot | null;
};

export function collectWarningLetterFinalizationBlockersHe(
  input: WarningLetterFinalizationGateInput,
): string[] {
  const blockers: string[] = [];

  if (input.debtCase.lawyerReviewStatus !== DebtCaseLawyerReviewStatus.APPROVED_FOR_LETTER_PREP) {
    blockers.push("התיק אינו מאושר להכנת מכתב.");
  }

  if (input.loadState !== WarningLetterDraftLoadState.ACTIVE_CURRENT || !input.draft) {
    blockers.push("יש טיוטה פעילה ומעודכנת לפני סגירת מסמך סופי.");
  }

  if (
    input.legalWordingApprovalStatus !== WarningLetterDraftLegalApprovalStatus.APPROVED
  ) {
    blockers.push("נוסח המכתב טרם אושר משפטית לגרסה זו.");
  }

  if (input.draft && !input.draft.approvalReady) {
    if (!input.draft.snapshot.isOperativeSnapshot) {
      blockers.push("הטיוטה אינה שלמה — חסרים נתונים כספיים או תצוגה.");
    }
    for (const variantId of input.draft.unapprovedTemplateVariantIds) {
      blockers.push(formatUnapprovedTemplateVariantHe(variantId));
    }
  }

  for (const row of WARNING_LETTER_TEMPLATE_VARIANT_CATALOG) {
    if (row.requiresLawyerClarification) {
      blockers.push(`${row.titleHe} — נדרשת הבהרה משפטית לפני שימוש מבצעי.`);
    }
  }

  if (!input.legalReadiness.legalTreatmentAllowed) {
    for (const reason of input.legalReadiness.holdReasons) {
      blockers.push(formatLegalHoldReasonHe(reason));
    }
  }

  if (!input.operativeDeadlinePolicyConfirmed) {
    blockers.push(WARNING_LETTER_OPERATIVE_DEADLINE_POLICY_BLOCKED_HE);
  }

  if (input.operativeSnapshotForFinalize) {
    blockers.push(...collectOperativeFinalSnapshotBlockersHe(input.operativeSnapshotForFinalize));
  }

  return [...new Set(blockers)];
}

/** Legacy dispatch gate — always blocked (automatic channels). */
export function collectWarningLetterDispatchBlockersHe(
  input: WarningLetterFinalizationGateInput & { hasFinalDocument: boolean },
): string[] {
  const blockers = collectWarningLetterFinalizationBlockersHe(input);
  if (!input.hasFinalDocument) {
    blockers.push("לא נוצר רישום סגירת מסמך סופי לתיק זה.");
  }
  blockers.push(
    "הגשה אוטומטית חסומה — ניתן לתעד ניסיון/הוכחות ידנית בלבד, ללא אישור משלוח.",
  );
  return [...new Set(blockers)];
}

export function collectWarningLetterManualDeliveryBlockersHe(input: {
  debtCase: DebtCaseRecord;
  finalDocument: WarningLetterFinalDocumentView | null;
}): string[] {
  const blockers: string[] = [];

  if (!input.finalDocument) {
    blockers.push("לא נוצר מסמך סופי — תיעוד משלוח חסום.");
    return blockers;
  }

  if (input.finalDocument.status !== WarningLetterFinalDocumentStatus.READY_FOR_DELIVERY) {
    blockers.push("מסמך הסופי אינו מוכן להפצה מבצעית.");
  }

  if (!input.finalDocument.pdfAvailable) {
    blockers.push("PDF סופי אינו זמין — לא ניתן לתעד משלוח מבצעי.");
  }

  if (input.debtCase.lawyerReviewStatus !== DebtCaseLawyerReviewStatus.APPROVED_FOR_LETTER_PREP) {
    blockers.push("התיק טרם אושר להכנת מכתב — תיעוד משלוח חסום.");
  }

  const workflowOk =
    input.debtCase.workflowStatus === DebtCaseWorkflowStatus.AWAITING_LAWYER_REVIEW ||
    input.debtCase.workflowStatus === DebtCaseWorkflowStatus.LETTER_SENT;

  if (!workflowOk) {
    blockers.push("סטטוס תיק אינו מאפשר תיעוד משלוח ידני.");
  }

  return blockers;
}
