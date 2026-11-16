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
import { applyFinalizationLetterDatesToSnapshot } from "@/modules/warning-letters/snapshot/apply-finalization-letter-dates";
import { buildWarningLetterLegalReadinessChecklist } from "@/modules/warning-letters/services/warning-letter-legal-readiness-checklist.service";
import { loadOperativeDeadlinePolicyConfirmation } from "@/modules/warning-letters/services/warning-letter-operative-deadline-policy.service";
import { todayJerusalemIso } from "@/shared/time/jerusalem-calendar";
import { listWarningLetterDeliveryRecords } from "@/modules/warning-letters/services/warning-letter-delivery.service";
import { loadWarningLetterFinalDocumentForCase } from "@/modules/warning-letters/services/warning-letter-finalization.service";
import { buildWarningLetterPostLetterTrackingView } from "@/modules/warning-letters/services/warning-letter-post-letter-tracking.service";
import { loadAdminDebtCaseActivity } from "@/modules/admin/services/admin-activity.service";
import {
  getDocumentStorageUiState,
  listDebtCaseDocumentAssetsForLawyerAdmin,
} from "@/modules/document-assets/services/document-asset.service";
import { requireLawyerAdminPortal } from "@/shared/auth/require-access";
import { DebtCaseWorkflowStatus } from "@/modules/debt-cases/domain/debt-case-workflow-status";
import { loadDebtCasePostLetterFinanceBundle } from "@/modules/debt-cases/services/debt-case-post-letter-finance.service";
import { loadStatementOfClaimDraftWorkspace } from "@/modules/statement-of-claim-drafts/services/statement-of-claim-draft.service";
import { buildDebtCaseEvidenceInventory } from "@/modules/debt-cases/services/debt-case-evidence-inventory.service";

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
  const evidenceInventory = await buildDebtCaseEvidenceInventory({
    context,
    debtCase: bundle.record,
  });

  const [caseActivity, caseDocuments, documentStorageState] = await Promise.all([
    loadAdminDebtCaseActivity({ context, debtCaseId }),
    listDebtCaseDocumentAssetsForLawyerAdmin({
      context,
      debtCaseId,
      buildingId: bundle.record.buildingId,
    }),
    Promise.resolve(getDocumentStorageUiState()),
  ]);
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
  const operativeDeadlinePolicy = await loadOperativeDeadlinePolicyConfirmation();
  const operativeDeadlinePolicyConfirmed = operativeDeadlinePolicy != null;
  let warningLetterPostLetterTracking: ReturnType<
    typeof buildWarningLetterPostLetterTrackingView
  > | null = null;
  let postLetterFinance: Awaited<ReturnType<typeof loadDebtCasePostLetterFinanceBundle>> = null;
  let statementOfClaimDraftWorkspace: Awaited<
    ReturnType<typeof loadStatementOfClaimDraftWorkspace>
  > | null = null;

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
      const operativeSnapshotForFinalize = warningLetterDraftDetail.draft
        ? applyFinalizationLetterDatesToSnapshot(
            warningLetterDraftDetail.draft.snapshot,
            todayJerusalemIso(),
          )
        : null;
      warningLetterLegalChecklist = await buildWarningLetterLegalReadinessChecklist({
        debtCase: bundle.record,
        legalReadiness: bundle.legalReadiness,
        loadState: warningLetterDraftDetail.loadState,
        draft: warningLetterDraftDetail.draft,
        legalWordingApprovalStatus: warningLetterDraftDetail.legalWordingApprovalStatus,
        hasFinalDocument: warningLetterFinalDocument != null,
        operativeDeadlinePolicyConfirmed,
        operativeSnapshotForFinalize,
        finalDocument: warningLetterFinalDocument,
      });
      warningLetterPostLetterTracking = buildWarningLetterPostLetterTrackingView({
        record: bundle.record,
        finalDocument: warningLetterFinalDocument,
        deliveryRecords: warningLetterDeliveryRecords,
      });
      if (
        bundle.record.workflowStatus === DebtCaseWorkflowStatus.LETTER_SENT ||
        bundle.record.workflowStatus === DebtCaseWorkflowStatus.CLOSED_MANUAL
      ) {
        postLetterFinance = await loadDebtCasePostLetterFinanceBundle(debtCaseId);
      }
      if (warningLetterFinalDocument != null) {
        statementOfClaimDraftWorkspace = await loadStatementOfClaimDraftWorkspace({
          context,
          debtCaseId,
          debtCase: bundle.record,
          legalReadiness: bundle.legalReadiness,
        });
      }
    } catch (error) {
      if (error instanceof WarningLetterDraftError) {
        warningLetterDraftErrorHe = formatWarningLetterDraftErrorHe(error.code);
      } else {
        throw error;
      }
    }
  }

  return (
    <AdminPageFrame
      title={title}
      subtitle={bundle.buildingDisplayName}
      breadcrumbs={[
        { label: "סקירה", href: "/app/admin" },
        { label: "תיקי חוב", href: "/app/admin/debt-cases" },
        { label: "בדיקת תיק" },
      ]}
    >
      <LawyerDebtCaseReviewDetail
        bundle={bundle}
        caseActivity={caseActivity}
        caseDocuments={caseDocuments}
        documentStorageState={documentStorageState}
        warningLetterDraftDetail={warningLetterDraftDetail}
        warningLetterDraftErrorHe={warningLetterDraftErrorHe}
        warningLetterApprovalBlockersHe={warningLetterApprovalBlockersHe}
        warningLetterRevisionHistory={warningLetterRevisionHistory}
        warningLetterLegalChecklist={warningLetterLegalChecklist}
        warningLetterFinalDocument={warningLetterFinalDocument}
        warningLetterDeliveryRecords={warningLetterDeliveryRecords}
        operativeDeadlinePolicy={operativeDeadlinePolicy}
        warningLetterPostLetterTracking={warningLetterPostLetterTracking}
        caseDocumentAssets={caseDocuments}
        postLetterFinance={postLetterFinance}
        statementOfClaimDraftWorkspace={statementOfClaimDraftWorkspace}
        evidenceInventory={evidenceInventory}
      />
    </AdminPageFrame>
  );
}
