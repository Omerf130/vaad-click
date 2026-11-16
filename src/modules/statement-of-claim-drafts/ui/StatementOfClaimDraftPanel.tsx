"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/Button/Button";
import {
  generateStatementOfClaimDraftFormAction,
  type AdminStatementOfClaimDraftActionState,
} from "@/modules/statement-of-claim-drafts/actions/admin-statement-of-claim-draft.actions";
import { STATEMENT_OF_CLAIM_DEV_ONLY_BANNER_HE } from "@/modules/statement-of-claim-templates/domain/statement-of-claim-template-body";
import type { StatementOfClaimDraftWorkspaceView } from "@/modules/statement-of-claim-drafts/services/statement-of-claim-draft.service";
import { StatementOfClaimDraftStatus } from "@/modules/statement-of-claim-drafts/domain/statement-of-claim-draft-status";
import { formatDebtCaseInstantHe } from "@/modules/debt-cases/presentation/debt-case-labels.he";
import {
  resolveStatementOfClaimSectionDisplayBody,
  resolveStatementOfClaimSectionDisplayTitle,
  normalizeLegacyStatementOfClaimSection,
} from "@/modules/statement-of-claim-drafts/domain/statement-of-claim-draft-content-snapshot.types";
import { StatementOfClaimDraftSectionEditor } from "@/modules/statement-of-claim-drafts/ui/StatementOfClaimDraftSectionEditor";
import { StatementOfClaimReviewPdfDownload } from "@/modules/statement-of-claim-drafts/ui/StatementOfClaimReviewPdfDownload";
import styles from "@/modules/statement-of-claim-drafts/ui/StatementOfClaimDraftPanel.module.scss";

type Props = {
  debtCaseId: string;
  workspace: StatementOfClaimDraftWorkspaceView;
};

const initialState: AdminStatementOfClaimDraftActionState = { ok: false, message: "" };

export function StatementOfClaimDraftPanel({ debtCaseId, workspace }: Props) {
  const [state, dispatch, pending] = useActionState(
    generateStatementOfClaimDraftFormAction,
    initialState,
  );

  const { readiness, activeDraft, revisionHistory } = workspace;
  const canGenerate = readiness.hardBlockersHe.length === 0;

  return (
    <div id="statement-of-claim-draft" tabIndex={-1}>
      <p className={styles.bannerDev} role="status">
        {STATEMENT_OF_CLAIM_DEV_ONLY_BANNER_HE}
      </p>

      <h2 className={styles.sectionTitle}>כתב תביעה — טיוטה פנימית (פיתוח)</h2>

      <div className={styles.sectionCard}>
        <h3 className={styles.sectionTitle}>מוכנות ליצירת טיוטה</h3>
        {readiness.hardBlockersHe.length > 0 ? (
          <ul className={styles.listCompact}>
            {readiness.hardBlockersHe.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : (
          <p className={styles.statusOk}>אין חסמים טכניים — ניתן ליצור טיוטת פיתוח.</p>
        )}
        {readiness.legalWarningsHe.length > 0 ? (
          <>
            <h4 className={styles.sectionTitle}>אזהרות משפטיות (לא חוסמות בפיתוח)</h4>
            <ul className={styles.listCompact}>
              {readiness.legalWarningsHe.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </>
        ) : null}
      </div>

      <form action={dispatch} className={styles.actionsRow}>
        <input type="hidden" name="debtCaseId" value={debtCaseId} />
        <Button type="submit" disabled={!canGenerate || pending} variant="primary">
          צור טיוטת כתב תביעה
        </Button>
        {activeDraft && !activeDraft.isMaterialCurrent ? (
          <label>
            <input type="checkbox" name="forceRegenerate" /> עדכן מחדש (נתונים השתנו)
          </label>
        ) : null}
        {activeDraft?.manuallyEdited ? (
          <label>
            <input type="checkbox" name="acknowledgeReplaceLawyerEdits" /> אישור: החלפת עריכות עורך
            דין ביצירה מחדש מנתוני מערכת
          </label>
        ) : null}
      </form>

      {state.message ? (
        <p
          className={`${styles.statusMessage} ${state.ok ? styles.statusOk : styles.statusError}`}
          role="status"
        >
          {state.message}
        </p>
      ) : null}

      {activeDraft ? (
        <>
          {activeDraft.isMaterialCurrent ? null : (
            <p className={styles.bannerStale} role="status">
              הנתונים שעליהם מבוססת הטיוטה השתנו (תיק, מכתב סופי, תשלומים, משלוח או תבנית). יש ליצור
              טיוטה מחדש עם סימון «עדכן מחדש».
            </p>
          )}

          <div className={styles.metaGrid}>
            <div>
              <strong>גירסת טיוטה:</strong> {activeDraft.draftRevision}
            </div>
            <div>
              <strong>סטטוס:</strong> לפיתוח בלבד (לא מבצעי)
            </div>
            <div>
              <strong>נוצר:</strong> {formatDebtCaseInstantHe(activeDraft.createdAtIso)}
            </div>
            <div>
              <strong>סימוכין:</strong> {activeDraft.contentSnapshot.letterCaseReference}
            </div>
          </div>

          <div className={styles.sectionCard}>
            <h3 className={styles.sectionTitle}>סיכום נתוני מקור</h3>
            <dl className={styles.metaGrid}>
              <div>
                <dt>כתובת</dt>
                <dd>{activeDraft.contentSnapshot.sourceSummary.buildingAddressHe}</dd>
              </div>
              <div>
                <dt>חייב</dt>
                <dd>{activeDraft.contentSnapshot.sourceSummary.debtorDisplayNameHe}</dd>
              </div>
              <div>
                <dt>תקופה</dt>
                <dd>{activeDraft.contentSnapshot.sourceSummary.debtPeriodHe}</dd>
              </div>
              <div>
                <dt>סכום במכתב התראה (קפוא)</dt>
                <dd>{activeDraft.contentSnapshot.sourceSummary.letterTotalDueDisplay}</dd>
              </div>
              <div>
                <dt>יתרה לפי תיעוד</dt>
                <dd>{activeDraft.contentSnapshot.sourceSummary.outstandingBalanceDisplay}</dd>
              </div>
              <div>
                <dt>משלוח</dt>
                <dd>{activeDraft.contentSnapshot.sourceSummary.delivery.channelsSummaryHe}</dd>
              </div>
            </dl>
          </div>

          <StatementOfClaimReviewPdfDownload
            debtCaseId={debtCaseId}
            draftId={activeDraft.draftId}
            draftRevision={activeDraft.draftRevision}
          />

          <StatementOfClaimDraftSectionEditor debtCaseId={debtCaseId} activeDraft={activeDraft} />

          <div className={styles.sectionCard}>
            <h3 className={styles.sectionTitle}>תצוגת טיוטה נוכחית</h3>
            {activeDraft.contentSnapshot.sections.map((raw) => {
              const section = normalizeLegacyStatementOfClaimSection(raw);
              return (
                <article key={section.sectionId} style={{ marginBottom: "1rem" }}>
                  <h4 className={styles.sectionTitle}>
                    {resolveStatementOfClaimSectionDisplayTitle(section)}
                    {section.hasIncompleteLawyerFields ? " · ניסוח עורך דין חסר" : ""}
                    {section.lawyerBodyOverride || section.titleLawyerOverride
                      ? " · ערוך על ידי עורך דין"
                      : ""}
                  </h4>
                  <div className={styles.sectionBody}>
                    {resolveStatementOfClaimSectionDisplayBody(section)}
                  </div>
                </article>
              );
            })}
          </div>

          {revisionHistory.length > 1 ? (
            <div className={styles.sectionCard}>
              <h3 className={styles.sectionTitle}>היסטוריית גירסאות</h3>
              <ul className={styles.listCompact}>
                {revisionHistory.map((row) => (
                  <li key={row.draftId}>
                    גירסה {row.draftRevision} ·{" "}
                    {row.status === StatementOfClaimDraftStatus.ACTIVE ? "פעילה" : "הוחלפה"} ·{" "}
                    {row.manuallyEdited ? "עריכת עורך דין · " : ""}
                    {formatDebtCaseInstantHe(row.createdAtIso)} · {row.contentSha256Prefix}…
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      ) : (
        <p className={styles.statusMessage}>טרם נוצרה טיוטת כתב תביעה פנימית לתיק זה.</p>
      )}
    </div>
  );
}