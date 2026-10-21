"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import {
  formatDebtPeriodDisplayHe,
  formatLegalDebtorHe,
  formatMinorUnitsToNisDisplay,
  formatDebtCaseInstantHe,
} from "@/modules/debt-cases/presentation/debt-case-labels.he";
import {
  LAWYER_CASE_TAB_ACTIVITY,
  LAWYER_CASE_TAB_DOCUMENTS,
  LAWYER_CASE_TAB_OVERVIEW,
  LAWYER_CASE_TAB_WARNING_LETTER,
  resolveLawyerCaseTabForSection,
} from "@/modules/debt-cases/presentation/lawyer-case-section-navigation";
import {
  DebtCaseLawyerReviewStatusBadge,
  DebtCaseWorkflowStatusBadge,
} from "@/modules/debt-cases/ui/DebtCaseStatusBadges";
import type { LawyerDebtCaseDetailBundle } from "@/modules/debt-cases/services/lawyer-debt-case-query.service";
import { LawyerCaseOverviewPanel } from "@/modules/debt-cases/ui/lawyer/LawyerCaseOverviewPanel";
import { LawyerDebtCaseReviewActions } from "@/modules/debt-cases/ui/lawyer/LawyerDebtCaseReviewActions";
import type { WarningLetterDraftDetailResult } from "@/modules/warning-letters/services/warning-letter-draft.service";
import type { WarningLetterDeliveryRecordView } from "@/modules/warning-letters/services/warning-letter-delivery.service";
import type { WarningLetterFinalDocumentView } from "@/modules/warning-letters/services/warning-letter-finalization.service";
import type { WarningLetterLegalReadinessChecklist } from "@/modules/warning-letters/services/warning-letter-legal-readiness-checklist.service";
import { WarningLetterLawyerDraftWorkspace } from "@/modules/warning-letters/ui/WarningLetterLawyerDraftWorkspace";
import { WarningLetterDraftLegalApprovalStatus } from "@/modules/warning-letters/domain/warning-letter-draft-legal-approval-status";
import { WarningLetterDraftLoadState } from "@/modules/warning-letters/domain/warning-letter-draft-load-state";
import { WarningLetterDraftStatus } from "@/modules/warning-letters/domain/warning-letter-draft-status";
import { WarningLetterPreviewUnavailable } from "@/modules/warning-letters/ui/WarningLetterPreviewUnavailable";
import { AdminActivityTimeline } from "@/modules/admin/components/AdminActivityTimeline";
import type { AdminActivityEntry } from "@/modules/admin/services/admin-activity.service";
import type { AdminDocumentAssetListItem } from "@/modules/document-assets/presentation/document-asset-view.types";
import type { DocumentStorageUiState } from "@/modules/document-assets/presentation/document-asset-view.types";
import { DebtCaseDocumentsSection } from "@/modules/debt-cases/ui/DebtCaseDocumentsSection";
import {
  WorkspaceAccessibleTabs,
  type WorkspaceTabDefinition,
} from "@/modules/debt-cases/ui/WorkspaceAccessibleTabs";
import workspaceStyles from "@/modules/debt-cases/ui/DebtCaseWorkspace.module.scss";
import styles from "@/modules/debt-cases/ui/lawyer/LawyerDebtCasesAdmin.module.scss";

type Props = {
  bundle: LawyerDebtCaseDetailBundle;
  caseActivity?: AdminActivityEntry[];
  caseDocuments?: AdminDocumentAssetListItem[];
  documentStorageState?: DocumentStorageUiState;
  warningLetterDraftDetail?: WarningLetterDraftDetailResult | null;
  warningLetterDraftErrorHe?: string | null;
  warningLetterApprovalBlockersHe?: string[];
  warningLetterRevisionHistory?: Array<{
    draftId: string;
    draftRevision: number;
    status: WarningLetterDraftStatus;
    legalWordingApprovalStatus: WarningLetterDraftLegalApprovalStatus;
    manuallyEdited: boolean;
    createdAtIso: string;
    contentSha256Prefix: string;
  }>;
  warningLetterLegalChecklist?: WarningLetterLegalReadinessChecklist | null;
  warningLetterFinalDocument?: WarningLetterFinalDocumentView | null;
  warningLetterDeliveryRecords?: WarningLetterDeliveryRecordView[];
};

export function LawyerDebtCaseReviewDetail({
  bundle,
  warningLetterDraftDetail,
  warningLetterDraftErrorHe,
  warningLetterApprovalBlockersHe = [],
  warningLetterRevisionHistory = [],
  warningLetterLegalChecklist = null,
  warningLetterFinalDocument = null,
  warningLetterDeliveryRecords = [],
  caseActivity = [],
  caseDocuments = [],
  documentStorageState = { configured: false, state: "storage_not_configured" },
}: Props) {
  const { record, buildingDisplayName, buildingCity, canPerformReviewActions } = bundle;
  const caseTitle = `דירה ${record.apartmentNumberDisplay || "—"} · ${buildingDisplayName}`;
  const [activeTabId, setActiveTabId] = useState(() => {
    if (typeof window === "undefined") {
      return LAWYER_CASE_TAB_OVERVIEW;
    }
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash) {
      return LAWYER_CASE_TAB_OVERVIEW;
    }
    return resolveLawyerCaseTabForSection(hash);
  });

  const jumpToSection = useCallback((sectionId: string) => {
    const tabId = resolveLawyerCaseTabForSection(sectionId);
    setActiveTabId(tabId);
    requestAnimationFrame(() => {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
      document.getElementById(sectionId)?.focus({ preventScroll: true });
    });
  }, []);

  const focusCaseOverview = useCallback(() => {
    setActiveTabId(LAWYER_CASE_TAB_OVERVIEW);
    requestAnimationFrame(() => {
      document.getElementById("case-overview")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash) {
      return;
    }
    requestAnimationFrame(() => {
      document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
      document.getElementById(hash)?.focus({ preventScroll: true });
    });
  }, []);

  const showWarningLetterTab =
    warningLetterLegalChecklist != null ||
    warningLetterDraftDetail != null ||
    Boolean(warningLetterDraftErrorHe);

  const overviewPanel = (
    <LawyerCaseOverviewPanel bundle={bundle} onJumpToSection={jumpToSection} />
  );

  const warningLetterPanel = (
    <div className={workspaceStyles.tabPanelStack}>
      {warningLetterDraftErrorHe ? (
        <WarningLetterPreviewUnavailable messageHe={warningLetterDraftErrorHe} />
      ) : null}
      {warningLetterDraftDetail ? (
        <WarningLetterLawyerDraftWorkspace
          presentation="tabs"
          detail={warningLetterDraftDetail}
          debtCaseId={record.debtCaseId}
          buildingId={record.buildingId}
          approvalBlockersHe={warningLetterApprovalBlockersHe}
          revisionHistory={warningLetterRevisionHistory}
          checklist={warningLetterLegalChecklist}
          onBackToCaseOverview={focusCaseOverview}
          lifecycle={
            warningLetterLegalChecklist
              ? {
                  debtCaseId: record.debtCaseId,
                  buildingId: record.buildingId,
                  draftId: warningLetterDraftDetail.draft?.draftId ?? null,
                  checklist: warningLetterLegalChecklist,
                  finalDocument: warningLetterFinalDocument,
                  deliveryRecords: warningLetterDeliveryRecords,
                  debtorDisplayName: formatLegalDebtorHe(record.parties.legalDebtorDesignation),
                }
              : null
          }
        />
      ) : warningLetterLegalChecklist ? (
        <WarningLetterLawyerDraftWorkspace
          presentation="tabs"
          detail={{
            loadState: WarningLetterDraftLoadState.NO_DRAFT_YET,
            letterCaseReference: null,
            latestDraftRevision: null,
            invalidationReason: null,
            invalidatedAtIso: null,
            legalWordingApprovalStatus: WarningLetterDraftLegalApprovalStatus.NONE,
            draft: null,
          }}
          debtCaseId={record.debtCaseId}
          buildingId={record.buildingId}
          approvalBlockersHe={warningLetterApprovalBlockersHe}
          revisionHistory={warningLetterRevisionHistory}
          checklist={warningLetterLegalChecklist}
          onBackToCaseOverview={focusCaseOverview}
          lifecycle={{
            debtCaseId: record.debtCaseId,
            buildingId: record.buildingId,
            draftId: null,
            checklist: warningLetterLegalChecklist,
            finalDocument: warningLetterFinalDocument,
            deliveryRecords: warningLetterDeliveryRecords,
            debtorDisplayName: formatLegalDebtorHe(record.parties.legalDebtorDesignation),
          }}
        />
      ) : null}
    </div>
  );

  const lawyerTabs: WorkspaceTabDefinition[] = [
    { id: LAWYER_CASE_TAB_OVERVIEW, label: "סקירת תיק", panel: overviewPanel },
    {
      id: LAWYER_CASE_TAB_DOCUMENTS,
      label: "מסמכים",
      panel: (
        <div id="case-documents">
          <DebtCaseDocumentsSection
            variant="admin"
            documents={caseDocuments}
            storageState={documentStorageState}
            embedded
          />
        </div>
      ),
    },
    {
      id: LAWYER_CASE_TAB_ACTIVITY,
      label: "פעילות",
      panel: (
        <div id="case-activity">
          <AdminActivityTimeline items={caseActivity} linkDebtCases={false} />
        </div>
      ),
    },
  ];

  if (showWarningLetterTab) {
    lawyerTabs.push({
      id: LAWYER_CASE_TAB_WARNING_LETTER,
      label: "מכתב התראה",
      panel: warningLetterPanel,
    });
  }

  return (
    <div className={`${workspaceStyles.workspace} ${workspaceStyles.workspaceLawyer}`}>
      <p className={styles.linkRow}>
        <Link href="/app/admin/debt-cases">חזרה לתור בדיקה</Link>
        {" · "}
        <Link href={`/app/admin/buildings/${record.buildingId}`}>פרטי בניין</Link>
      </p>

      <header id="case-overview" className={workspaceStyles.caseHeader} tabIndex={-1}>
        <div className={workspaceStyles.caseHeaderMain}>
          <h1 className={workspaceStyles.caseHeaderTitle}>{caseTitle}</h1>
          <div className={workspaceStyles.caseHeaderBadges}>
            <DebtCaseWorkflowStatusBadge status={record.workflowStatus} />
            <DebtCaseLawyerReviewStatusBadge status={record.lawyerReviewStatus} />
          </div>
          <p className={workspaceStyles.caseHeaderMeta}>
            {buildingDisplayName}
            {buildingCity ? ` · ${buildingCity}` : ""} ·{" "}
            {formatMinorUnitsToNisDisplay(record.principalAmountMinor)} ₪ ·{" "}
            {formatDebtPeriodDisplayHe(record.periodStartMonth, record.periodEndMonth)} · הוגש:{" "}
            {record.submittedAtIso ? formatDebtCaseInstantHe(record.submittedAtIso) : "—"}
          </p>
          <p className={styles.headerStatusHint}>
            «מחזור תיק» — שלב תפעולי; «החלטת בדיקה» — החלטת עורך הדין על התיק.
          </p>
        </div>
      </header>

      <div className={workspaceStyles.lawyerReviewBar}>
        {canPerformReviewActions ? (
          <LawyerDebtCaseReviewActions
            debtCaseId={record.debtCaseId}
            revision={record.revision}
            onJumpToSection={jumpToSection}
          />
        ) : (
          <p className={styles.bannerInfoCompact} role="status">
            אין פעולות בדיקה זמינות במצב הנוכחי של התיק (מחזור תיק או החלטת בדיקה אינם מאפשרים פעולה).
          </p>
        )}
      </div>

      <WorkspaceAccessibleTabs
        tabs={lawyerTabs}
        activeTabId={activeTabId}
        onTabChange={setActiveTabId}
        ariaLabel="תוכן בדיקת תיק"
        mountHiddenPanels
      />
    </div>
  );
}
