"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button/Button";
import { DebtCaseWorkflowStatus } from "@/modules/debt-cases/domain/debt-case-workflow-status";
import type { DebtCaseRecord } from "@/modules/debt-cases/domain/debt-case-record.types";
import type { DebtCaseFormDefaults } from "@/modules/debt-cases/presentation/debt-case-form.defaults";
import { isOperatorDebtCaseEditable } from "@/modules/debt-cases/presentation/debt-case-editability";
import {
  formatDebtPeriodDisplayHe,
  formatLegalDebtorHe,
  formatMinorUnitsToNisDisplay,
} from "@/modules/debt-cases/presentation/debt-case-labels.he";
import { DebtCaseDocumentsSection } from "@/modules/debt-cases/ui/DebtCaseDocumentsSection";
import { DebtCaseOperatorForm } from "@/modules/debt-cases/ui/DebtCaseOperatorForm";
import { OperatorDebtCaseOverviewPanel } from "@/modules/debt-cases/ui/OperatorDebtCaseOverviewPanel";
import {
  WorkspaceAccessibleTabs,
  type WorkspaceTabDefinition,
} from "@/modules/debt-cases/ui/WorkspaceAccessibleTabs";
import type { PortalDocumentAssetListItem } from "@/modules/document-assets/presentation/document-asset-view.types";
import type { DocumentStorageUiState } from "@/modules/document-assets/presentation/document-asset-view.types";
import type { OperatorDebtCaseActivityEntry } from "@/modules/portal/services/operator-debt-case-activity.service";
import { OperatorCaseActivityPanel } from "@/modules/portal/ui/OperatorCaseActivityPanel";
import { OperatorCaseLifecyclePanel } from "@/modules/portal/ui/OperatorCaseLifecyclePanel";
import {
  DebtCaseLawyerReviewStatusBadge,
  DebtCaseWorkflowStatusBadge,
} from "@/modules/debt-cases/ui/DebtCaseStatusBadges";
import styles from "@/modules/debt-cases/ui/DebtCaseWorkspace.module.scss";

const TAB_OVERVIEW = "overview";
const TAB_EDIT = "edit";
const TAB_DOCUMENTS = "documents";
const TAB_ACTIVITY = "activity";

type Props = {
  buildingId: string;
  buildingDisplayName: string;
  record: DebtCaseRecord;
  defaults: DebtCaseFormDefaults;
  activity: OperatorDebtCaseActivityEntry[];
  returnFeedbackHe: string | null;
  documents: PortalDocumentAssetListItem[];
  storageState: DocumentStorageUiState;
};

function nextActionHint(record: DebtCaseRecord, editable: boolean, isReturned: boolean): string {
  if (isReturned && editable) {
    return "עדכנו את הפרטים בלשונית «עריכה והשלמה» ושלחו מחדש לבדיקה.";
  }
  if (record.workflowStatus === DebtCaseWorkflowStatus.DRAFT && editable) {
    return "השלימו את פרטי התיק ושלחו לבדיקת עורך הדין.";
  }
  if (record.workflowStatus === DebtCaseWorkflowStatus.AWAITING_LAWYER_REVIEW) {
    return "התיק בבדיקת עורך הדין — אין פעולה נדרשת כרגע.";
  }
  if (record.workflowStatus === DebtCaseWorkflowStatus.REJECTED) {
    return "התיק נדחה — פנו למשרד עורך הדין.";
  }
  return "עקבו אחר מצב התיק בלשונית «סקירה» וב«פעילות».";
}

export function OperatorDebtCaseWorkspace({
  buildingId,
  buildingDisplayName,
  record,
  defaults,
  activity,
  returnFeedbackHe,
  documents,
  storageState,
}: Props) {
  const editable = isOperatorDebtCaseEditable(record);
  const isReturned = record.workflowStatus === DebtCaseWorkflowStatus.RETURNED_FOR_COMPLETION;
  const [activeTabId, setActiveTabId] = useState(TAB_OVERVIEW);

  function goToEditTab() {
    setActiveTabId(TAB_EDIT);
    requestAnimationFrame(() => {
      document.getElementById(`${TAB_EDIT}-panel-focus`)?.focus();
    });
  }

  const primaryOwner = record.parties.propertyOwners[0];
  const debtorShort = primaryOwner?.fullName?.trim() || formatLegalDebtorHe(record.parties.legalDebtorDesignation);
  const essentials = `${formatMinorUnitsToNisDisplay(record.principalAmountMinor)} ₪ · ${formatDebtPeriodDisplayHe(record.periodStartMonth, record.periodEndMonth)}`;

  const tabs: WorkspaceTabDefinition[] = [
    {
      id: TAB_OVERVIEW,
      label: "סקירה",
      panel: (
        <div className={styles.tabPanelStack}>
          <p className={styles.nextAction}>{nextActionHint(record, editable, isReturned)}</p>
          <OperatorCaseLifecyclePanel record={record} embedded />
          <OperatorDebtCaseOverviewPanel record={record} buildingDisplayName={buildingDisplayName} compact />
        </div>
      ),
    },
    {
      id: TAB_EDIT,
      label: "עריכה והשלמה",
      panel: (
        <div className={styles.tabPanelStack}>
          <p id={`${TAB_EDIT}-panel-focus`} tabIndex={-1} className={styles.tabPanelLead}>
            שמירת טיוטה שומרת שינויים; שליחה לבדיקה אינה שולחת מכתב התראה.
          </p>
          <DebtCaseOperatorForm
            buildingId={buildingId}
            record={record}
            defaults={defaults}
            compactLayout
          />
        </div>
      ),
    },
    {
      id: TAB_DOCUMENTS,
      label: "מסמכים",
      panel: (
        <DebtCaseDocumentsSection
          variant="portal"
          documents={documents}
          storageState={storageState}
          embedded
        />
      ),
    },
    {
      id: TAB_ACTIVITY,
      label: "פעילות",
      panel: <OperatorCaseActivityPanel activity={activity} embedded />,
    },
  ];

  return (
    <div className={styles.workspace}>
      <header className={styles.caseHeader}>
        <div className={styles.caseHeaderMain}>
          <h1 className={styles.caseHeaderTitle}>
            {buildingDisplayName} · דירה {record.apartmentNumberDisplay || "—"}
          </h1>
          <div className={styles.caseHeaderBadges}>
            <DebtCaseWorkflowStatusBadge status={record.workflowStatus} />
            <DebtCaseLawyerReviewStatusBadge status={record.lawyerReviewStatus} />
          </div>
          <p className={styles.caseHeaderMeta}>
            {debtorShort} · {essentials}
          </p>
        </div>
        <div className={styles.caseHeaderActions}>
          {isReturned && editable ? (
            <Button type="button" size="sm" onClick={goToEditTab}>
              השלמת פרטים
            </Button>
          ) : editable && record.workflowStatus === DebtCaseWorkflowStatus.DRAFT ? (
            <Button type="button" size="sm" variant="secondary" onClick={goToEditTab}>
              עריכת תיק
            </Button>
          ) : null}
        </div>
      </header>

      {isReturned ? (
        <div className={styles.returnBannerCompact} role="status">
          <strong>התיק הוחזר להשלמה.</strong>{" "}
          {returnFeedbackHe ? (
            <span>
              הערת עורך דין: {returnFeedbackHe}
            </span>
          ) : (
            <span>עדכנו את הפרטים ושלחו מחדש.</span>
          )}{" "}
          <button type="button" className={styles.inlineTabLink} onClick={goToEditTab}>
            מעבר לעריכה
          </button>
        </div>
      ) : null}

      <WorkspaceAccessibleTabs
        tabs={tabs}
        activeTabId={activeTabId}
        onTabChange={setActiveTabId}
        ariaLabel="תוכן תיק חוב"
        mountHiddenPanels
      />
    </div>
  );
}
