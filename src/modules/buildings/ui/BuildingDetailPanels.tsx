"use client";

import { useActionState, useRef, useState, type RefObject } from "react";

import { Button } from "@/components/ui/Button/Button";
import { AdminConfirmDialog } from "@/modules/admin/components/AdminConfirmDialog";
import {
  archiveBuildingFormAction,
  assignRepresentativeFormAction,
  clearRepresentativeFormAction,
  linkManagementCompanyFormAction,
  unlinkManagementCompanyFormAction,
  updateBuildingFormAction,
  type AdminBuildingActionState,
} from "@/modules/buildings/actions/admin-building.actions";
import {
  formatBuildingOrganizationalStatusHe,
  formatLawyerVerificationStatusHe,
} from "@/modules/buildings/presentation/building-labels.he";
import type { AdminBuildingDetail } from "@/modules/buildings/services/admin-building-query.service";
import type { EligibleRepresentativeOption } from "@/modules/buildings/services/admin-building-query.service";
import { BuildingCommitteeEngagementPanel } from "@/modules/committee-engagements/ui/BuildingCommitteeEngagementPanel";
import type {
  AdminDocumentAssetListItem,
  DocumentStorageUiState,
} from "@/modules/document-assets/presentation/document-asset-view.types";
import { BuildingDocumentsPanel } from "@/modules/document-assets/ui/BuildingDocumentsPanel";
import type { AdminCommitteeEngagementView } from "@/modules/committee-engagements/services/committee-engagement.service";
import { BuildingLegalDocumentsAdminPanel } from "@/modules/building-legal-documents/ui/BuildingLegalDocumentsAdminPanel";
import { BuildingTreatmentFeeEligibilityPanel } from "@/modules/buildings/ui/BuildingTreatmentFeeEligibilityPanel";
import type { BuildingLegalDocumentCategoryAdminView } from "@/modules/building-legal-documents/services/building-legal-document.service";
import styles from "@/modules/users/ui/AdminUsers.module.scss";

type BuildingDetailPanelsProps = {
  building: AdminBuildingDetail;
  eligibleRepresentatives: EligibleRepresentativeOption[];
  managementCompanies: { managementCompanyId: string; displayName: string }[];
  committeeEngagement: AdminCommitteeEngagementView | null;
  buildingDocuments: AdminDocumentAssetListItem[];
  documentStorageState: DocumentStorageUiState;
  legalDocumentCategories: BuildingLegalDocumentCategoryAdminView[];
};

const initial: AdminBuildingActionState = { ok: false };

export function BuildingDetailPanels({
  building,
  eligibleRepresentatives,
  managementCompanies,
  committeeEngagement,
  buildingDocuments,
  documentStorageState,
  legalDocumentCategories,
}: BuildingDetailPanelsProps) {
  const [confirm, setConfirm] = useState<"removeRep" | "archive" | "unlink" | null>(null);
  const [updateState, updateAction, updatePending] = useActionState(updateBuildingFormAction, initial);
  const [assignState, assignAction, assignPending] = useActionState(assignRepresentativeFormAction, initial);
  const [clearState, clearAction, clearPending] = useActionState(clearRepresentativeFormAction, initial);
  const [linkState, linkAction, linkPending] = useActionState(linkManagementCompanyFormAction, initial);
  const [archiveState, archiveAction, archivePending] = useActionState(archiveBuildingFormAction, initial);
  const [unlinkState, unlinkAction, unlinkPending] = useActionState(unlinkManagementCompanyFormAction, initial);

  const clearFormRef = useRef<HTMLFormElement>(null);
  const archiveFormRef = useRef<HTMLFormElement>(null);
  const unlinkFormRef = useRef<HTMLFormElement>(null);

  const submitRef = (ref: RefObject<HTMLFormElement | null>) => ref.current?.requestSubmit();

  const feedback = [updateState, assignState, clearState, linkState, archiveState, unlinkState].find(
    (s) => s.message,
  );

  const isActive = building.organizationalStatus === "active";

  return (
    <div className={styles.detailGrid}>
      {feedback?.message ? (
        <p className={feedback.ok ? styles.feedbackSuccess : styles.feedbackError} role="status">
          {feedback.message}
        </p>
      ) : null}

      <section className={styles.detailCard}>
        <h2 className={styles.workspaceTitle}>פרטי בניין</h2>
        <p className={styles.metaLine}>
          סטטוס: {formatBuildingOrganizationalStatusHe(building.organizationalStatus)} · אימות:{" "}
          {formatLawyerVerificationStatusHe(building.lawyerVerificationStatus)}
        </p>
        <form action={updateAction} className={styles.filters}>
          <input type="hidden" name="buildingId" value={building.buildingId} />
          <div className={styles.field}>
            <label className={styles.label} htmlFor="displayName">שם תצוגה</label>
            <input id="displayName" name="displayName" className={styles.input} defaultValue={building.displayName} required />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="city">עיר</label>
            <input id="city" name="city" className={styles.input} defaultValue={building.address.city} required />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="street">רחוב</label>
            <input id="street" name="street" className={styles.input} defaultValue={building.address.street} required />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="houseNumber">מספר בית</label>
            <input id="houseNumber" name="houseNumber" className={styles.input} defaultValue={building.address.houseNumber} required />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="unitCount">מספר יחידות</label>
            <input id="unitCount" name="unitCount" type="number" className={styles.input} defaultValue={building.unitCount ?? ""} />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="fee">דמי ועד (אגורות)</label>
            <input id="fee" name="averageMonthlyVaadFeeMinor" type="number" className={styles.input} defaultValue={building.averageMonthlyVaadFeeMinor ?? ""} />
          </div>
          {updateState.code === "DUPLICATE_ADDRESS" ? (
            <div className={styles.field}>
              <label className={styles.label} htmlFor="dupReason">נימוק חריג כתובת</label>
              <textarea id="dupReason" name="duplicateAddressExceptionReason" className={styles.input} rows={3} minLength={3} />
            </div>
          ) : null}
          <Button type="submit" variant="secondary" size="sm" disabled={updatePending || !isActive}>
            שמירת שינויים
          </Button>
        </form>
        {isActive ? (
          <div className={styles.reviewActions}>
            <Button type="button" variant="ghost" size="sm" onClick={() => setConfirm("archive")}>
              העברה לארכיון
            </Button>
          </div>
        ) : null}
      </section>

      <BuildingTreatmentFeeEligibilityPanel building={building} />

      <section className={styles.detailCard}>
        <h2 className={styles.workspaceTitle}>נציגות בית משותף</h2>
        {building.representative ? (
          <p className={styles.definitionValue}>
            {building.representative.fullName} · {building.representative.email}
          </p>
        ) : (
          <p className={styles.metaLine}>לא משויך נציג.</p>
        )}
        {isActive ? (
          <>
            <form action={assignAction} className={styles.filters}>
              <input type="hidden" name="buildingId" value={building.buildingId} />
              {building.representative ? (
                <input type="hidden" name="previousRepresentativeUserId" value={building.representative.id} />
              ) : null}
              <div className={styles.field}>
                <label className={styles.label} htmlFor="rep">בחירת נציג מאושר</label>
                <select id="rep" name="representativeUserId" className={styles.select} required defaultValue="">
                  <option value="" disabled>בחרו נציג</option>
                  {eligibleRepresentatives.map((rep) => (
                    <option key={rep.id} value={rep.id}>
                      {rep.fullName} · {rep.email}
                    </option>
                  ))}
                </select>
              </div>
              <Button type="submit" variant="primary" size="sm" disabled={assignPending}>
                {building.representative ? "החלפת נציג" : "שיוך נציג"}
              </Button>
            </form>
            {building.representative ? (
              <Button type="button" variant="secondary" size="sm" onClick={() => setConfirm("removeRep")}>
                הסרת נציג
              </Button>
            ) : null}
          </>
        ) : null}
      </section>

      <BuildingCommitteeEngagementPanel
        buildingId={building.buildingId}
        engagement={committeeEngagement}
      />

      <BuildingDocumentsPanel
        buildingId={building.buildingId}
        documents={buildingDocuments}
        storageState={documentStorageState}
      />

      <section className={styles.detailCard}>
        <BuildingLegalDocumentsAdminPanel
          buildingId={building.buildingId}
          categories={legalDocumentCategories}
        />
      </section>

      <section className={styles.detailCard}>
        <h2 className={styles.workspaceTitle}>חברת ניהול</h2>
        {building.managementCompany ? (
          <p className={styles.definitionValue}>{building.managementCompany.displayName}</p>
        ) : (
          <p className={styles.metaLine}>לא משויכת חברת ניהול.</p>
        )}
        {isActive ? (
          <>
            <form action={linkAction} className={styles.filters}>
              <input type="hidden" name="buildingId" value={building.buildingId} />
              <div className={styles.field}>
                <label className={styles.label} htmlFor="mc">שיוך / החלפת חברה</label>
                <select id="mc" name="managementCompanyId" className={styles.select} required defaultValue="">
                  <option value="" disabled>בחרו חברה</option>
                  {managementCompanies.map((c) => (
                    <option key={c.managementCompanyId} value={c.managementCompanyId}>
                      {c.displayName}
                    </option>
                  ))}
                </select>
              </div>
              <Button type="submit" variant="primary" size="sm" disabled={linkPending}>
                שמירת שיוך
              </Button>
            </form>
            {building.managementCompany ? (
              <Button type="button" variant="secondary" size="sm" onClick={() => setConfirm("unlink")}>
                הסרת שיוך חברה
              </Button>
            ) : null}
          </>
        ) : null}
      </section>

      <form ref={clearFormRef} action={clearAction} className={styles.visuallyHidden}>
        <input type="hidden" name="buildingId" value={building.buildingId} />
      </form>
      <form ref={archiveFormRef} action={archiveAction} className={styles.visuallyHidden}>
        <input type="hidden" name="buildingId" value={building.buildingId} />
      </form>
      {building.managementCompany ? (
        <form ref={unlinkFormRef} action={unlinkAction} className={styles.visuallyHidden}>
          <input type="hidden" name="buildingId" value={building.buildingId} />
          <input type="hidden" name="managementCompanyId" value={building.managementCompany.managementCompanyId} />
        </form>
      ) : null}

      <AdminConfirmDialog
        open={confirm === "removeRep"}
        title="להסיר את הנציג מהבניין?"
        body="הנציג לא יוכל לגשת לנתוני הבניין לאחר ההסרה."
        confirmLabel="הסרה"
        cancelLabel="ביטול"
        pending={clearPending}
        destructive
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          setConfirm(null);
          submitRef(clearFormRef);
        }}
      />
      <AdminConfirmDialog
        open={confirm === "archive"}
        title="להעביר את הבניין לארכיון?"
        body="בניין בארכיון לא ייכלל בהרשאות תפעוליות (CP6B)."
        confirmLabel="העברה לארכיון"
        cancelLabel="ביטול"
        pending={archivePending}
        destructive
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          setConfirm(null);
          submitRef(archiveFormRef);
        }}
      />
      <AdminConfirmDialog
        open={confirm === "unlink"}
        title="להסיר את שיוך חברת הניהול?"
        body="גישת חברת הניהול לבניין זה תוסר מיד."
        confirmLabel="הסרת שיוך"
        cancelLabel="ביטול"
        pending={unlinkPending}
        destructive
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          setConfirm(null);
          submitRef(unlinkFormRef);
        }}
      />
    </div>
  );
}
