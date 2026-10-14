"use client";

import { useActionState, useCallback, useMemo, useRef, useState } from "react";

import { AdminTabs } from "@/modules/admin/components/AdminTabs";
import { Button } from "@/components/ui/Button/Button";
import { StatusBadge } from "@/components/ui/StatusBadge/StatusBadge";
import {
  discardFinancialSettingsDraftAction,
  publishFinancialSettingsDraftAction,
  updateFinancialSettingsDraftAction,
  type FinancialSettingsActionState,
} from "@/modules/financial-settings/actions/financial-settings.actions";
import {
  FINANCIAL_SETTINGS_TAB_IDS,
  FINANCIAL_SETTINGS_TAB_LABELS,
  resolveFinancialSettingsTabForFieldErrors,
  tabHasValidationErrors,
  type FinancialSettingsTabId,
} from "@/modules/financial-settings/presentation/financial-settings-tab-routing";
import { FINANCIAL_SETTINGS_UI_COPY } from "@/modules/financial-settings/presentation/financial-settings-messages.he";
import {
  evaluatePublishReviewEligibility,
  shouldShowPublishReviewDialog,
} from "@/modules/financial-settings/presentation/publish-review-visibility";
import type {
  DraftViewModel,
  PublishedVersionSummary,
} from "@/modules/financial-settings/presentation/financial-settings-view-model";
import { ConfirmDiscardDialog } from "@/modules/financial-settings/ui/ConfirmDiscardDialog";
import { PublishReviewDialog } from "@/modules/financial-settings/ui/PublishReviewDialog";
import styles from "@/modules/financial-settings/ui/FinancialSettingsAdmin.module.scss";

type VatRowState = { effectiveFromIso: string; ratePercent: string };

const initialActionState: FinancialSettingsActionState = { ok: true };

type FinancialSettingsDraftWorkspaceProps = {
  draft: DraftViewModel;
  minEffectiveDateIso: string;
  applicable: PublishedVersionSummary | null;
  futureVersions: PublishedVersionSummary[];
  historicalVersions: PublishedVersionSummary[];
};

export function FinancialSettingsDraftWorkspace({
  draft,
  minEffectiveDateIso,
  applicable,
  futureVersions,
  historicalVersions,
}: FinancialSettingsDraftWorkspaceProps) {
  const [userTabId, setUserTabId] = useState<FinancialSettingsTabId>("fees");
  const [debtorFee, setDebtorFee] = useState(draft.debtorTreatmentFeeShekels);
  const [committeeFee, setCommitteeFee] = useState(draft.committeeWaiverFeeShekels);
  const [escalationPercent, setEscalationPercent] = useState(draft.escalationPercent);
  const [notesInternal, setNotesInternal] = useState(draft.notesInternal);
  const [vatRows, setVatRows] = useState<VatRowState[]>(
    draft.vatRows.length
      ? draft.vatRows
      : [{ effectiveFromIso: minEffectiveDateIso, ratePercent: "" }],
  );
  const [effectiveFromIso, setEffectiveFromIso] = useState(minEffectiveDateIso);
  const [isDirty, setIsDirty] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
  const [reviewBlockedMessage, setReviewBlockedMessage] = useState<string | null>(null);

  const discardFormRef = useRef<HTMLFormElement>(null);

  const [saveState, saveAction, savePending] = useActionState(
    updateFinancialSettingsDraftAction,
    initialActionState,
  );
  const [publishState, publishAction, publishPending] = useActionState(
    publishFinancialSettingsDraftAction,
    initialActionState,
  );
  const [discardState, discardAction, discardPending] = useActionState(
    discardFinancialSettingsDraftAction,
    initialActionState,
  );

  const markDirty = useCallback(() => setIsDirty(true), []);
  const savedDraftSnapshot = useMemo(() => draft, [draft]);
  const vatScheduleJson = JSON.stringify(vatRows);
  const reviewVisible = shouldShowPublishReviewDialog(reviewOpen);
  const reviewEligibility = evaluatePublishReviewEligibility({ isDirty });

  const validationTabId =
    saveState.fieldErrors && Object.keys(saveState.fieldErrors).length > 0
      ? resolveFinancialSettingsTabForFieldErrors(saveState.fieldErrors)
      : null;
  const activeTabId = validationTabId ?? userTabId;

  const openReview = () => {
    setReviewBlockedMessage(null);
    const eligibility = evaluatePublishReviewEligibility({ isDirty });
    if (!eligibility.allowed) {
      setReviewBlockedMessage(eligibility.reasonHe ?? FINANCIAL_SETTINGS_UI_COPY.mustSaveBeforePublish);
      setUserTabId("publish");
      return;
    }
    setConfirmPublish(false);
    setReviewOpen(true);
  };

  const feesPanel = (
    <div className={styles.stack}>
      {draft.showSuggestedValueHints ? (
        <p className={[styles.banner, styles.bannerWarning].join(" ")}>
          {FINANCIAL_SETTINGS_UI_COPY.suggestedBanner}
        </p>
      ) : null}
      <div className={styles.field}>
        <label className={styles.label} htmlFor="debtorTreatmentFeeShekels">
          דמי טיפול לחייב (₪, לפני מע&quot;מ)
        </label>
        {draft.showSuggestedValueHints ? (
          <p className={styles.hint}>{FINANCIAL_SETTINGS_UI_COPY.suggestedFieldHint}</p>
        ) : null}
        <input
          id="debtorTreatmentFeeShekels"
          name="debtorTreatmentFeeShekels"
          className={styles.input}
          value={debtorFee}
          onChange={(event) => {
            setDebtorFee(event.target.value);
            markDirty();
          }}
          inputMode="decimal"
          required
          form="financial-settings-save-form"
        />
        {saveState.fieldErrors?.debtorTreatmentFeeShekels ? (
          <p className={styles.fieldError}>{saveState.fieldErrors.debtorTreatmentFeeShekels[0]}</p>
        ) : null}
      </div>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="committeeWaiverFeeShekels">
          דמי טיפול מהוועד בהיעדר גבייה מהחייב (₪, לפני מע&quot;מ)
        </label>
        <input
          id="committeeWaiverFeeShekels"
          name="committeeWaiverFeeShekels"
          className={styles.input}
          value={committeeFee}
          onChange={(event) => {
            setCommitteeFee(event.target.value);
            markDirty();
          }}
          inputMode="decimal"
          required
          form="financial-settings-save-form"
        />
        {saveState.fieldErrors?.committeeWaiverFeeShekels ? (
          <p className={styles.fieldError}>
            {saveState.fieldErrors.committeeWaiverFeeShekels[0]}
          </p>
        ) : null}
      </div>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="escalationPercent">
          אחוז גבייה בהליך משפטי
        </label>
        <input
          id="escalationPercent"
          name="escalationPercent"
          className={styles.input}
          value={escalationPercent}
          onChange={(event) => {
            setEscalationPercent(event.target.value);
            markDirty();
          }}
          inputMode="decimal"
          required
          form="financial-settings-save-form"
        />
        {saveState.fieldErrors?.escalationPercent ? (
          <p className={styles.fieldError}>{saveState.fieldErrors.escalationPercent[0]}</p>
        ) : null}
      </div>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="notesInternal">
          הערות פנימיות
        </label>
        <textarea
          id="notesInternal"
          name="notesInternal"
          className={styles.textarea}
          value={notesInternal}
          onChange={(event) => {
            setNotesInternal(event.target.value);
            markDirty();
          }}
          form="financial-settings-save-form"
        />
      </div>
    </div>
  );

  const vatPanel = (
    <div className={styles.stack}>
      <p className={styles.hint}>יש להזין לפחות שורה אחת לפני פרסום.</p>
      {vatRows.map((row, index) => (
        <div key={`vat-${index}`} className={styles.vatRow}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor={`vat-date-${index}`}>
              תאריך תחילה
            </label>
            <input
              id={`vat-date-${index}`}
              className={styles.input}
              type="date"
              value={row.effectiveFromIso}
              onChange={(event) => {
                const next = [...vatRows];
                next[index] = { ...row, effectiveFromIso: event.target.value };
                setVatRows(next);
                markDirty();
              }}
            />
            {saveState.fieldErrors?.[`vat_${index}_date`] ? (
              <p className={styles.fieldError}>
                {saveState.fieldErrors[`vat_${index}_date`][0]}
              </p>
            ) : null}
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor={`vat-rate-${index}`}>
              שיעור מע&quot;מ (%)
            </label>
            <input
              id={`vat-rate-${index}`}
              className={styles.input}
              value={row.ratePercent}
              onChange={(event) => {
                const next = [...vatRows];
                next[index] = { ...row, ratePercent: event.target.value };
                setVatRows(next);
                markDirty();
              }}
              inputMode="decimal"
              placeholder="לדוגמה: 18"
            />
            {saveState.fieldErrors?.[`vat_${index}_rate`] ? (
              <p className={styles.fieldError}>
                {saveState.fieldErrors[`vat_${index}_rate`][0]}
              </p>
            ) : null}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setVatRows(vatRows.filter((_, rowIndex) => rowIndex !== index));
              markDirty();
            }}
            disabled={vatRows.length <= 1}
          >
            הסרה
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => {
          setVatRows([...vatRows, { effectiveFromIso: minEffectiveDateIso, ratePercent: "" }]);
          markDirty();
        }}
      >
        הוספת שורת מע&quot;מ
      </Button>
    </div>
  );

  const publishPanel = (
    <div className={styles.stack}>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="effectiveFromIso">
          {FINANCIAL_SETTINGS_UI_COPY.publishEffectiveDate}
        </label>
        <input
          id="effectiveFromIso"
          className={styles.input}
          type="date"
          min={minEffectiveDateIso}
          value={effectiveFromIso}
          onChange={(event) => setEffectiveFromIso(event.target.value)}
        />
      </div>
      <p className={styles.hint}>
        לא ניתן לפרסם עם תאריך בעבר. גרסה עתידית תיכנס לתוקף רק במועד שנבחר.
      </p>
      {isDirty ? (
        <p className={styles.formError} role="status">
          {FINANCIAL_SETTINGS_UI_COPY.mustSaveBeforePublish}
        </p>
      ) : null}
      {reviewBlockedMessage ? (
        <p className={styles.formError} role="alert">
          {reviewBlockedMessage}
        </p>
      ) : null}
      {publishState.ok && publishState.message ? (
        <p className={styles.formSuccess}>{publishState.message}</p>
      ) : null}
      <div className={styles.actions}>
        <Button
          type="button"
          variant="secondary"
          disabled={savePending}
          onClick={openReview}
          title={
            reviewEligibility.allowed
              ? undefined
              : (reviewEligibility.reasonHe ?? FINANCIAL_SETTINGS_UI_COPY.mustSaveBeforePublish)
          }
        >
          {FINANCIAL_SETTINGS_UI_COPY.openPublishReview}
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={discardPending}
          onClick={() => setDiscardDialogOpen(true)}
        >
          {FINANCIAL_SETTINGS_UI_COPY.discardDraft}
        </Button>
      </div>
    </div>
  );

  const historyPanel = (
    <div className={styles.stack}>
      <section>
        <h3 className={styles.sectionTitle}>גרסה בתוקף כעת</h3>
        {applicable ? (
          <VersionTable rows={[applicable]} statusLabel="בתוקף" statusVariant="success" />
        ) : (
          <p className={styles.empty}>{FINANCIAL_SETTINGS_UI_COPY.noApplicableVersion}</p>
        )}
      </section>
      <section>
        <h3 className={styles.sectionTitle}>גרסאות עתידיות</h3>
        {futureVersions.length === 0 ? (
          <p className={styles.empty}>אין גרסאות מתוזמנות.</p>
        ) : (
          <VersionTable rows={futureVersions} statusLabel="עתידית" statusVariant="info" />
        )}
      </section>
      <section>
        <h3 className={styles.sectionTitle}>היסטוריית גרסאות שפורסמו</h3>
        {historicalVersions.length === 0 ? (
          <p className={styles.empty}>טרם פורסמו גרסאות.</p>
        ) : (
          <VersionTable rows={historicalVersions} statusLabel="היסטורית" statusVariant="neutral" />
        )}
      </section>
    </div>
  );

  const tabs = FINANCIAL_SETTINGS_TAB_IDS.map((tabId) => ({
    id: tabId,
    label: FINANCIAL_SETTINGS_TAB_LABELS[tabId],
    hasError: tabHasValidationErrors(tabId, saveState.fieldErrors),
    panel:
      tabId === "fees"
        ? feesPanel
        : tabId === "vat"
          ? vatPanel
          : tabId === "publish"
            ? publishPanel
            : historyPanel,
  }));

  return (
    <>
      <form id="financial-settings-save-form" action={saveAction} className={styles.workspaceCard}>
        <input type="hidden" name="revision" value={draft.revision} />
        <input type="hidden" name="vatScheduleJson" value={vatScheduleJson} readOnly />

        <div className={styles.workspaceToolbar}>
          <div>
            <p className={styles.workspaceTitle}>טיוטה לעריכה</p>
            {isDirty ? (
              <p className={styles.dirtyHint}>{FINANCIAL_SETTINGS_UI_COPY.unsavedDraftHint}</p>
            ) : (
              <p className={styles.hint}>כל השינויים נשמרו בטיוטה.</p>
            )}
          </div>
          <div className={styles.actions}>
            <Button type="submit" variant="primary" disabled={savePending}>
              {FINANCIAL_SETTINGS_UI_COPY.saveDraft}
            </Button>
          </div>
        </div>

        {saveState.message && !saveState.ok ? (
          <p className={styles.formError} role="alert">
            {saveState.message}
          </p>
        ) : null}
        {saveState.ok && saveState.message ? (
          <p className={styles.formSuccess}>{saveState.message}</p>
        ) : null}

        <AdminTabs
          ariaLabel="הגדרות כספיות"
          tabs={tabs}
          activeTabId={activeTabId}
          onTabChange={(tabId) => setUserTabId(tabId as FinancialSettingsTabId)}
        />
      </form>

      <form ref={discardFormRef} action={discardAction} hidden>
        <input type="hidden" name="confirmDiscard" value="yes" />
      </form>

      <PublishReviewDialog
        open={reviewVisible}
        savedDraft={savedDraftSnapshot}
        effectiveFromIso={effectiveFromIso}
        revision={draft.revision}
        confirmPublish={confirmPublish}
        onConfirmPublishChange={setConfirmPublish}
        onClose={() => setReviewOpen(false)}
        publishAction={publishAction}
        publishPending={publishPending}
        publishState={publishState}
      />

      <ConfirmDiscardDialog
        open={discardDialogOpen}
        pending={discardPending}
        errorMessage={discardState.message && !discardState.ok ? discardState.message : undefined}
        onCancel={() => setDiscardDialogOpen(false)}
        onConfirm={() => discardFormRef.current?.requestSubmit()}
      />
    </>
  );
}

function VersionTable({
  rows,
  statusLabel,
  statusVariant,
}: {
  rows: PublishedVersionSummary[];
  statusLabel: string;
  statusVariant: "success" | "info" | "neutral";
}) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">גרסה</th>
            <th scope="col">תחילת תוקף</th>
            <th scope="col">דמי חייב (₪)</th>
            <th scope="col">דמי וועד (₪)</th>
            <th scope="col">גבייה (%)</th>
            <th scope="col">סטטוס</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.settingsVersionId}>
              <td>{row.versionNumber}</td>
              <td>{row.effectiveFromIso}</td>
              <td>{row.debtorTreatmentFeeShekels}</td>
              <td>{row.committeeWaiverFeeShekels}</td>
              <td>{row.escalationPercent}</td>
              <td>
                <StatusBadge label={statusLabel} variant={statusVariant} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
