import { notFound } from "next/navigation";

import { AdminPageFrame } from "@/modules/admin/components/AdminPageFrame";
import { DebtCaseLawyerReviewStatus } from "@/modules/debt-cases/domain/debt-case-lawyer-review-status";
import { DebtCaseError, DebtCaseErrorCode } from "@/modules/debt-cases/domain/debt-case-errors";
import { loadLawyerDebtCaseDetailBundle } from "@/modules/debt-cases/services/lawyer-debt-case-query.service";
import { LawyerDebtCaseReviewDetail } from "@/modules/debt-cases/ui/lawyer/LawyerDebtCaseReviewDetail";
import {
  WarningLetterDraftError,
} from "@/modules/warning-letters/domain/warning-letter-draft-errors";
import { formatWarningLetterDraftErrorHe } from "@/modules/warning-letters/presentation/warning-letter-draft-messages.he";
import { collectWarningLetterWordingApprovalBlockersHe } from "@/modules/warning-letters/services/warning-letter-draft-approval-gates";
import { listWarningLetterDraftRevisionHistory } from "@/modules/warning-letters/services/warning-letter-draft-approval.service";
import {
  loadWarningLetterDraftDetailForApprovedCaseReadOnly,
  type WarningLetterDraftDetailResult,
} from "@/modules/warning-letters/services/warning-letter-draft.service";
import { buildWarningLetterLegalReadinessChecklist } from "@/modules/warning-letters/services/warning-letter-legal-readiness-checklist.service";
import { listWarningLetterDeliveryRecords } from "@/modules/warning-letters/services/warning-letter-delivery.service";
import { loadWarningLetterFinalDocumentForCase } from "@/modules/warning-letters/services/warning-letter-finalization.service";
import { requireLawyerAdminPortal } from "@/shared/auth/require-access";

type PageProps = {
  params: Promise<{ debtCaseId: string }>;
};

async function loadBundle(debtCaseId: string) {
  const context = await requireLawyerAdminPortal();
  try {
    return await loadLawyerDebtCaseDetailBundle({ context, debtCaseId });
  } catch (error) {
    if (error instanceof DebtCaseError && error.code === DebtCaseErrorCode.NOT_FOUND) {
      notFound();
    }
    throw error;
  }
}

export default async function AdminDebtCaseReviewDetailPage({ params }: PageProps) {
  const { debtCaseId } = await params;
  const context = await requireLawyerAdminPortal();
  const bundle = await loadBundle(debtCaseId);
  const title = `בדיקת תיק · דירה ${bundle.record.apartmentNumberDisplay || "—"}`;

  let warningLetterDraftDetail: WarningLetterDraftDetailResult | null = null;
  let warningLetterDraftErrorHe: string | null = null;
  let warningLetterApprovalBlockersHe: string[] = [];
  let warningLetterRevisionHistory: Awaited<
    ReturnType<typeof listWarningLetterDraftRevisionHistory>
  > = [];
  let warningLetterLegalChecklist: Awaited<
    ReturnType<typeof buildWarningLetterLegalReadinessChecklist>
  > | null = null;
  let warningLetterFinalDocument: Awaited<
    ReturnType<typeof loadWarningLetterFinalDocumentForCase>
  > = null;
  let warningLetterDeliveryRecords: Awaited<
    ReturnType<typeof listWarningLetterDeliveryRecords>
  > = [];

  if (bundle.record.lawyerReviewStatus === DebtCaseLawyerReviewStatus.APPROVED_FOR_LETTER_PREP) {
    try {
      warningLetterDraftDetail = await loadWarningLetterDraftDetailForApprovedCaseReadOnly({
        context,
        debtCaseId,
        debtCaseRecord: bundle.record,
      });
      warningLetterRevisionHistory = await listWarningLetterDraftRevisionHistory({
        context,
        debtCaseId,
      });
      warningLetterApprovalBlockersHe = collectWarningLetterWordingApprovalBlockersHe({
        debtCase: bundle.record,
        legalReadiness: bundle.legalReadiness,
        loadState: warningLetterDraftDetail.loadState,
        draft: warningLetterDraftDetail.draft,
        legalWordingApprovalStatus: warningLetterDraftDetail.legalWordingApprovalStatus,
      });
      warningLetterFinalDocument = await loadWarningLetterFinalDocumentForCase(debtCaseId);
      warningLetterDeliveryRecords = await listWarningLetterDeliveryRecords(debtCaseId);
      warningLetterLegalChecklist = await buildWarningLetterLegalReadinessChecklist({
        debtCase: bundle.record,
        legalReadiness: bundle.legalReadiness,
        loadState: warningLetterDraftDetail.loadState,
        draft: warningLetterDraftDetail.draft,
        legalWordingApprovalStatus: warningLetterDraftDetail.legalWordingApprovalStatus,
        hasFinalDocument: warningLetterFinalDocument != null,
      });
    } catch (error) {
      if (error instanceof WarningLetterDraftError) {
        warningLetterDraftErrorHe = formatWarningLetterDraftErrorHe(error.code);
      } else {
        throw error;
      }
    }
  }

  return (
    <AdminPageFrame title={title} subtitle={bundle.buildingDisplayName}>
      <LawyerDebtCaseReviewDetail
        bundle={bundle}
        warningLetterDraftDetail={warningLetterDraftDetail}
        warningLetterDraftErrorHe={warningLetterDraftErrorHe}
        warningLetterApprovalBlockersHe={warningLetterApprovalBlockersHe}
        warningLetterRevisionHistory={warningLetterRevisionHistory}
        warningLetterLegalChecklist={warningLetterLegalChecklist}
        warningLetterFinalDocument={warningLetterFinalDocument}
        warningLetterDeliveryRecords={warningLetterDeliveryRecords}
      />
    </AdminPageFrame>
  );
}
