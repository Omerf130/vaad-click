import "server-only";

import { getDocumentStorageCapability } from "@/modules/document-assets/infra/document-storage-registry";
import type { BuildingLegalReadinessResult } from "@/modules/debt-cases/domain/debt-case-legal-readiness";
import type { DebtCaseRecord } from "@/modules/debt-cases/domain/debt-case-record.types";
import { DebtCaseLawyerReviewStatus } from "@/modules/debt-cases/domain/debt-case-lawyer-review-status";
import { WarningLetterDraftLegalApprovalStatus } from "@/modules/warning-letters/domain/warning-letter-draft-legal-approval-status";
import { WarningLetterDraftLoadState } from "@/modules/warning-letters/domain/warning-letter-draft-load-state";
import {
  isWarningLetterOperativeDeadlinePolicyResolved,
  WARNING_LETTER_ELECTRONIC_SIGNING_BLOCKED_HE,
  WARNING_LETTER_OPERATIVE_DEADLINE_POLICY_BLOCKED_HE,
  WARNING_LETTER_PAYMENT_COLLECTION_BLOCKED_HE,
  WARNING_LETTER_PDF_STORAGE_BLOCKED_HE,
} from "@/modules/warning-letters/domain/warning-letter-operative-policy";
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
    blockers.push(WARNING_LETTER_ELECTRONIC_SIGNING_BLOCKED_HE);
  }

  if (!isWarningLetterOperativeDeadlinePolicyResolved()) {
    blockers.push(WARNING_LETTER_OPERATIVE_DEADLINE_POLICY_BLOCKED_HE);
  }

  blockers.push(WARNING_LETTER_PAYMENT_COLLECTION_BLOCKED_HE);

  const storage = getDocumentStorageCapability();
  if (storage.state !== "configured") {
    blockers.push(WARNING_LETTER_PDF_STORAGE_BLOCKED_HE);
  }

  return [...new Set(blockers)];
}

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
