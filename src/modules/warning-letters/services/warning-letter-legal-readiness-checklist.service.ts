import "server-only";

import type { BuildingLegalReadinessResult } from "@/modules/debt-cases/domain/debt-case-legal-readiness";
import { formatLegalHoldReasonHe } from "@/modules/debt-cases/presentation/debt-case-labels.he";
import type { DebtCaseRecord } from "@/modules/debt-cases/domain/debt-case-record.types";
import { DebtCaseLawyerReviewStatus } from "@/modules/debt-cases/domain/debt-case-lawyer-review-status";
import { getDocumentStorageCapability } from "@/modules/document-assets/infra/document-storage-registry";
import { WarningLetterDraftLegalApprovalStatus } from "@/modules/warning-letters/domain/warning-letter-draft-legal-approval-status";
import { WarningLetterDraftLoadState } from "@/modules/warning-letters/domain/warning-letter-draft-load-state";
import {
  isWarningLetterOperativeDeadlinePolicyResolved,
  WARNING_LETTER_ELECTRONIC_SIGNING_BLOCKED_HE,
  WARNING_LETTER_OPERATIVE_DEADLINE_POLICY_BLOCKED_HE,
  WARNING_LETTER_PAYMENT_COLLECTION_BLOCKED_HE,
  WARNING_LETTER_PDF_STORAGE_BLOCKED_HE,
  WARNING_LETTER_WHATSAPP_DISPATCH_BLOCKED_HE,
} from "@/modules/warning-letters/domain/warning-letter-operative-policy";
import { formatUnapprovedTemplateVariantHe } from "@/modules/warning-letters/presentation/warning-letter-approval-blockers.he";
import { collectWarningLetterWordingApprovalBlockersHe } from "@/modules/warning-letters/services/warning-letter-draft-approval-gates";
import {
  collectWarningLetterDispatchBlockersHe,
  collectWarningLetterFinalizationBlockersHe,
} from "@/modules/warning-letters/services/warning-letter-finalization-gates";
import type { WarningLetterDraftView } from "@/modules/warning-letters/services/warning-letter-draft.service";
import { listWarningLetterTemplateVariantCatalogWithApprovalStatus } from "@/modules/warning-letters/services/warning-letter-template-variant-approval.service";

export type LegalReadinessItemStatus =
  | "complete"
  | "missing"
  | "needs_lawyer"
  | "blocked_integration";

export type LegalReadinessChecklistItem = {
  id: string;
  labelHe: string;
  status: LegalReadinessItemStatus;
  detailHe?: string;
};

export type WarningLetterLegalReadinessChecklist = {
  items: LegalReadinessChecklistItem[];
  wordingApprovalAllowed: boolean;
  finalizationAllowed: boolean;
  dispatchAllowed: boolean;
};

export async function buildWarningLetterLegalReadinessChecklist(input: {
  debtCase: DebtCaseRecord;
  legalReadiness: BuildingLegalReadinessResult;
  loadState: WarningLetterDraftLoadState;
  draft: WarningLetterDraftView | null;
  legalWordingApprovalStatus: WarningLetterDraftLegalApprovalStatus;
  hasFinalDocument: boolean;
}): Promise<WarningLetterLegalReadinessChecklist> {
  const items: LegalReadinessChecklistItem[] = [];

  items.push({
    id: "case_letter_prep",
    labelHe: "אישור תיק להכנת מכתב",
    status:
      input.debtCase.lawyerReviewStatus === DebtCaseLawyerReviewStatus.APPROVED_FOR_LETTER_PREP
        ? "complete"
        : "missing",
  });

  items.push({
    id: "building_legal_treatment",
    labelHe: "מוכנות משפטית של הבניין (אימות, הסכם, ייפוי כוח)",
    status: input.legalReadiness.legalTreatmentAllowed ? "complete" : "missing",
    detailHe: input.legalReadiness.holdReasons.map(formatLegalHoldReasonHe).join(" · ") || undefined,
  });

  if (!input.legalReadiness.legalTreatmentAllowed) {
    items.push({
      id: "electronic_signing",
      labelHe: "חתימות והצהרות אלקטרוניות",
      status: "blocked_integration",
      detailHe: WARNING_LETTER_ELECTRONIC_SIGNING_BLOCKED_HE,
    });
  }

  const templateRows = await listWarningLetterTemplateVariantCatalogWithApprovalStatus();
  const pendingTemplates = templateRows.filter((row) => !row.approved);
  items.push({
    id: "template_variants",
    labelHe: "אישור גרסאות ניסוח תבנית (גלובלי)",
    status: pendingTemplates.length === 0 ? "complete" : "needs_lawyer",
    detailHe:
      pendingTemplates.length > 0
        ? pendingTemplates.map((row) => row.titleHe).join(" · ")
        : undefined,
  });

  if (input.draft) {
    for (const variantId of input.draft.unapprovedTemplateVariantIds) {
      items.push({
        id: `draft_variant_${variantId}`,
        labelHe: "ניסוח תבנית בטיוטה הנוכחית",
        status: "needs_lawyer",
        detailHe: formatUnapprovedTemplateVariantHe(variantId),
      });
    }
  }

  items.push({
    id: "draft_current",
    labelHe: "טיוטה פעילה מסונכרנת",
    status:
      input.loadState === WarningLetterDraftLoadState.ACTIVE_CURRENT && input.draft
        ? "complete"
        : "missing",
  });

  items.push({
    id: "wording_approved",
    labelHe: "אישור נוסח משפטי לגרסת הטיוטה",
    status:
      input.legalWordingApprovalStatus === WarningLetterDraftLegalApprovalStatus.APPROVED
        ? "complete"
        : "missing",
  });

  items.push({
    id: "deadline_policy",
    labelHe: "מדיניות מועד לתשלום (גרסה מבצעית)",
    status: isWarningLetterOperativeDeadlinePolicyResolved() ? "complete" : "needs_lawyer",
    detailHe: isWarningLetterOperativeDeadlinePolicyResolved()
      ? undefined
      : WARNING_LETTER_OPERATIVE_DEADLINE_POLICY_BLOCKED_HE,
  });

  items.push({
    id: "payment_integration",
    labelHe: "גביית תשלום / קישור תשלום",
    status: "blocked_integration",
    detailHe: WARNING_LETTER_PAYMENT_COLLECTION_BLOCKED_HE,
  });

  const storage = getDocumentStorageCapability();
  items.push({
    id: "pdf_storage",
    labelHe: "אחסון PDF פרטי",
    status: storage.state === "configured" ? "complete" : "blocked_integration",
    detailHe: storage.state === "configured" ? undefined : WARNING_LETTER_PDF_STORAGE_BLOCKED_HE,
  });

  items.push({
    id: "dispatch_channels",
    labelHe: "ערוצי הגשה (ווטסאפ/SMS/דוא\"ל)",
    status: "blocked_integration",
    detailHe: WARNING_LETTER_WHATSAPP_DISPATCH_BLOCKED_HE,
  });

  if (input.hasFinalDocument) {
    items.push({
      id: "final_document",
      labelHe: "רישום סגירת מסמך סופי",
      status: "complete",
    });
  }

  const wordingBlockers = collectWarningLetterWordingApprovalBlockersHe({
    debtCase: input.debtCase,
    legalReadiness: input.legalReadiness,
    loadState: input.loadState,
    draft: input.draft,
    legalWordingApprovalStatus: input.legalWordingApprovalStatus,
  });

  const finalizationBlockers = collectWarningLetterFinalizationBlockersHe({
    debtCase: input.debtCase,
    legalReadiness: input.legalReadiness,
    loadState: input.loadState,
    draft: input.draft,
    legalWordingApprovalStatus: input.legalWordingApprovalStatus,
  });

  const dispatchBlockers = collectWarningLetterDispatchBlockersHe({
    debtCase: input.debtCase,
    legalReadiness: input.legalReadiness,
    loadState: input.loadState,
    draft: input.draft,
    legalWordingApprovalStatus: input.legalWordingApprovalStatus,
    hasFinalDocument: input.hasFinalDocument,
  });

  return {
    items,
    wordingApprovalAllowed: wordingBlockers.length === 0,
    finalizationAllowed: finalizationBlockers.length === 0,
    dispatchAllowed: dispatchBlockers.length === 0,
  };
}
