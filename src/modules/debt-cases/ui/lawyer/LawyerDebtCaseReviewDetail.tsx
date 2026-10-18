"use client";

import Link from "next/link";
import { useState } from "react";

import { StatusBadge } from "@/components/ui/StatusBadge/StatusBadge";
import { DebtCaseOccupancyType } from "@/modules/debt-cases/domain/debt-case-occupancy-type";
import {
  formatDebtPeriodDisplayHe,
  formatDebtTypeHe,
  formatIdentityDocumentTypeHe,
  formatLegalDebtorHe,
  formatLegalHoldReasonHe,
  formatMinorUnitsToNisDisplay,
  formatMobileE164ForDisplayHe,
  formatOccupancyTypeHe,
  formatValidationSeverityHe,
} from "@/modules/debt-cases/presentation/debt-case-labels.he";
import {
  DebtCaseLawyerReviewStatusBadge,
  DebtCaseWorkflowStatusBadge,
} from "@/modules/debt-cases/ui/DebtCaseStatusBadges";
import type { LawyerDebtCaseDetailBundle } from "@/modules/debt-cases/services/lawyer-debt-case-query.service";
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

const LAWYER_TAB_OVERVIEW = "overview";
const LAWYER_TAB_DOCUMENTS = "documents";
const LAWYER_TAB_ACTIVITY = "activity";
const LAWYER_TAB_WARNING_LETTER = "warning-letter";

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

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) {
    return "—";
  }
  return new Date(iso).toLocaleString("he-IL", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

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
  const { record, buildingDisplayName, buildingCity, legalReadiness, canPerformReviewActions } =
    bundle;
  const owners = record.parties.propertyOwners;
  const tenant = record.parties.tenant;
  const caseTitle = `דירה ${record.apartmentNumberDisplay || "—"} · ${buildingDisplayName}`;
  const [activeTabId, setActiveTabId] = useState(LAWYER_TAB_OVERVIEW);

  const showWarningLetterTab =
    warningLetterLegalChecklist != null ||
    warningLetterDraftDetail != null ||
    Boolean(warningLetterDraftErrorHe);

  const overviewPanel = (
    <>
      <section className={styles.section} aria-labelledby="parties-title">
        <h2 id="parties-title" className={styles.sectionTitle}>
          צדדים
        </h2>
        <dl className={styles.definitionList}>
          <div>
            <dt>מצב אכלוס</dt>
            <dd>{formatOccupancyTypeHe(record.parties.occupancyType)}</dd>
          </div>
          <div>
            <dt>חייב משפטי</dt>
            <dd>{formatLegalDebtorHe(record.parties.legalDebtorDesignation)}</dd>
          </div>
          {record.parties.postalAddress ? (
            <div>
              <dt>כתובת למכתבים</dt>
              <dd>{record.parties.postalAddress}</dd>
            </div>
          ) : null}
        </dl>
        {owners.map((owner, index) => (
          <div key={index} className={styles.partyCard}>
            <strong>{index === 0 ? "בעלים ראשון" : "בעלים שני"}</strong>
            <dl className={styles.definitionList}>
              <div>
                <dt>שם</dt>
                <dd>{owner.fullName}</dd>
              </div>
              <div>
                <dt>נייד</dt>
                <dd>{formatMobileE164ForDisplayHe(owner.mobileE164)}</dd>
              </div>
              <div>
                <dt>זיהוי</dt>
                <dd>
                  {formatIdentityDocumentTypeHe(owner.identityDocumentType)}
                  {owner.identityNumber ? ` · ${owner.identityNumber}` : ""}
                </dd>
              </div>
              {owner.email ? (
                <div>
                  <dt>דוא&quot;ל</dt>
                  <dd>{owner.email}</dd>
                </div>
              ) : null}
            </dl>
          </div>
        ))}
        {record.parties.occupancyType === DebtCaseOccupancyType.TENANT && tenant ? (
          <div className={styles.partyCard}>
            <strong>שוכר</strong>
            <dl className={styles.definitionList}>
              <div>
                <dt>שם</dt>
                <dd>{tenant.fullName}</dd>
              </div>
              <div>
                <dt>נייד</dt>
                <dd>{formatMobileE164ForDisplayHe(tenant.mobileE164)}</dd>
              </div>
              <div>
                <dt>זיהוי</dt>
                <dd>
                  {formatIdentityDocumentTypeHe(tenant.identityDocumentType)}
                  {tenant.identityNumber ? ` · ${tenant.identityNumber}` : ""}
                </dd>
              </div>
              {tenant.email ? (
                <div>
                  <dt>דוא&quot;ל</dt>
                  <dd>{tenant.email}</dd>
                </div>
              ) : null}
            </dl>
          </div>
        ) : null}
      </section>

      <section className={styles.section} aria-labelledby="debt-title">
        <h2 id="debt-title" className={styles.sectionTitle}>
          פרטי חוב
        </h2>
        <dl className={styles.definitionList}>
          <div>
            <dt>סוג חוב</dt>
            <dd>{formatDebtTypeHe(record.debtType)}</dd>
          </div>
          {record.specialAssessmentDescription ? (
            <div>
              <dt>תיאור</dt>
              <dd>{record.specialAssessmentDescription}</dd>
            </div>
          ) : null}
        </dl>
        {record.validationFlags.length > 0 ? (
          <div>
            <p className={styles.metaLine}>דגלי בדיקה מההגשה</p>
            <ul className={styles.flagList}>
              {record.validationFlags.map((flag, index) => (
                <li key={`${flag.code}-${index}`}>
                  [{formatValidationSeverityHe(flag.severity)}] {flag.messageHe}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <section className={styles.section} aria-labelledby="readiness-title">
        <h2 id="readiness-title" className={styles.sectionTitle}>
          מוכנות משפטית
        </h2>
        <p
          className={
            legalReadiness.legalTreatmentAllowed ? styles.bannerSuccess : styles.bannerWarning
          }
        >
          {legalReadiness.legalTreatmentAllowed
            ? "הבניין מוכן לטיפול משפטי (שליחת מכתב) — בכפוף לפעולה מפורשת נפרדת."
            : "טיפול משפטי (שליחת מכתב) חסום עד השלמת תנאי המוכנות."}
        </p>
        <p className={styles.bannerInfo}>
          הגשה לבדיקה ואישור להכנת מכתב אינם שולחים מכתב. אישור להכנת מכתב הוא החלטת ביקורת פנימית
          בלבד.
        </p>
        <dl className={styles.definitionList}>
          <div>
            <dt>ניתן להגיש / לבדוק תיק</dt>
            <dd>כן — התיק הוגש לבדיקה</dd>
          </div>
          <div>
            <dt>טיפול משפטי / מכתב</dt>
            <dd>
              <StatusBadge
                variant={legalReadiness.legalTreatmentAllowed ? "success" : "warning"}
                label={legalReadiness.legalTreatmentAllowed ? "מותר" : "חסום"}
              />
            </dd>
          </div>
        </dl>
        {legalReadiness.holdReasons.length > 0 ? (
          <ul className={styles.flagList}>
            {legalReadiness.holdReasons.map((reason) => (
              <li key={reason}>{formatLegalHoldReasonHe(reason)}</li>
            ))}
          </ul>
        ) : (
          <p className={styles.metaLine}>אין חסימות מוכנות משפטית פעילות.</p>
        )}
        {record.legalHoldReasons.length > 0 ? (
          <>
            <p className={styles.metaLine}>חסימות רשומות על התיק</p>
            <ul className={styles.flagList}>
              {record.legalHoldReasons.map((reason) => (
                <li key={reason}>{formatLegalHoldReasonHe(reason)}</li>
              ))}
            </ul>
          </>
        ) : null}
      </section>
    </>
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
    { id: LAWYER_TAB_OVERVIEW, label: "סקירת תיק", panel: overviewPanel },
    {
      id: LAWYER_TAB_DOCUMENTS,
      label: "מסמכים",
      panel: (
        <DebtCaseDocumentsSection
          variant="admin"
          documents={caseDocuments}
          storageState={documentStorageState}
          embedded
        />
      ),
    },
    {
      id: LAWYER_TAB_ACTIVITY,
      label: "פעילות",
      panel: <AdminActivityTimeline items={caseActivity} linkDebtCases={false} />,
    },
  ];

  if (showWarningLetterTab) {
    lawyerTabs.push({
      id: LAWYER_TAB_WARNING_LETTER,
      label: "מכתב התראה",
      panel: warningLetterPanel,
    });
  }

  return (
    <div className={workspaceStyles.workspace}>
      <p className={styles.linkRow}>
        <Link href="/app/admin/debt-cases">חזרה לתור בדיקה</Link>
        {" · "}
        <Link href={`/app/admin/buildings/${record.buildingId}`}>פרטי בניין</Link>
      </p>

      <header className={workspaceStyles.caseHeader}>
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
            {formatDateTime(record.submittedAtIso)}
          </p>
        </div>
      </header>

      <div className={workspaceStyles.lawyerReviewBar}>
        {canPerformReviewActions ? (
          <LawyerDebtCaseReviewActions debtCaseId={record.debtCaseId} revision={record.revision} />
        ) : (
          <p className={styles.bannerInfo} role="status">
            אין פעולות בדיקה זמינות במצב הנוכחי של התיק.
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
