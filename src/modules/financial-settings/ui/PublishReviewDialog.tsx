"use client";

import { Button } from "@/components/ui/Button/Button";
import { FINANCIAL_SETTINGS_UI_COPY } from "@/modules/financial-settings/presentation/financial-settings-messages.he";
import type { DraftViewModel } from "@/modules/financial-settings/presentation/financial-settings-view-model";
import type { FinancialSettingsActionState } from "@/modules/financial-settings/actions/financial-settings.actions";
import styles from "@/modules/financial-settings/ui/FinancialSettingsAdmin.module.scss";

type PublishReviewDialogProps = {
  open: boolean;
  savedDraft: DraftViewModel;
  effectiveFromIso: string;
  revision: number;
  confirmPublish: boolean;
  onConfirmPublishChange: (checked: boolean) => void;
  onClose: () => void;
  publishAction: (payload: FormData) => void;
  publishPending: boolean;
  publishState: FinancialSettingsActionState;
};

export function PublishReviewDialog({
  open,
  savedDraft,
  effectiveFromIso,
  revision,
  confirmPublish,
  onConfirmPublishChange,
  onClose,
  publishAction,
  publishPending,
  publishState,
}: PublishReviewDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div className={styles.dialogBackdrop} role="presentation">
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="publish-review-title"
      >
        <h2 id="publish-review-title" className={styles.dialogTitle}>
          {FINANCIAL_SETTINGS_UI_COPY.publishReviewTitle}
        </h2>
        <dl className={styles.definitionList}>
          <div className={styles.definitionRow}>
            <dt className={styles.definitionTerm}>דמי טיפול לחייב</dt>
            <dd className={styles.definitionValue}>
              {savedDraft.debtorTreatmentFeeShekels} ₪ (לפני מע&quot;מ)
            </dd>
          </div>
          <div className={styles.definitionRow}>
            <dt className={styles.definitionTerm}>דמי טיפול מהוועד</dt>
            <dd className={styles.definitionValue}>
              {savedDraft.committeeWaiverFeeShekels} ₪ (לפני מע&quot;מ)
            </dd>
          </div>
          <div className={styles.definitionRow}>
            <dt className={styles.definitionTerm}>אחוז גבייה</dt>
            <dd className={styles.definitionValue}>{savedDraft.escalationPercent}%</dd>
          </div>
          <div className={styles.definitionRow}>
            <dt className={styles.definitionTerm}>מע&quot;מ</dt>
            <dd className={styles.definitionValue}>
              {savedDraft.vatRows.length
                ? savedDraft.vatRows
                    .map((row) => `${row.effectiveFromIso}: ${row.ratePercent}%`)
                    .join(" · ")
                : "—"}
            </dd>
          </div>
          <div className={styles.definitionRow}>
            <dt className={styles.definitionTerm}>תאריך תחילת תוקף</dt>
            <dd className={styles.definitionValue}>{effectiveFromIso}</dd>
          </div>
          <div className={styles.definitionRow}>
            <dt className={styles.definitionTerm}>מדיניות משפטית</dt>
            <dd className={styles.definitionValue}>
              {FINANCIAL_SETTINGS_UI_COPY.courtCostsUnresolved} ·{" "}
              {FINANCIAL_SETTINGS_UI_COPY.escalationBaseUnresolved}
            </dd>
          </div>
        </dl>
        {savedDraft.showSuggestedValueHints ? (
          <p className={styles.banner}>{FINANCIAL_SETTINGS_UI_COPY.suggestedBanner}</p>
        ) : null}
        <p className={styles.hint}>
          לאחר פרסום לא ניתן לערוך גרסה זו. תיקון יתבצע באמצעות גרסה חדשה עם תאריך תוקף עתידי.
        </p>
        <form action={publishAction} className={styles.stack}>
          <input type="hidden" name="revision" value={revision} />
          <input type="hidden" name="effectiveFromIso" value={effectiveFromIso} />
          <input type="hidden" name="confirmPublish" value={confirmPublish ? "yes" : "no"} />
          <label className={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={confirmPublish}
              onChange={(event) => onConfirmPublishChange(event.target.checked)}
            />
            <span>{FINANCIAL_SETTINGS_UI_COPY.publishConfirmLabel}</span>
          </label>
          {publishState.message && !publishState.ok ? (
            <p className={styles.formError} role="alert">
              {publishState.message}
            </p>
          ) : null}
          <div className={styles.actions}>
            <Button type="submit" variant="primary" disabled={!confirmPublish || publishPending}>
              {FINANCIAL_SETTINGS_UI_COPY.publishVersion}
            </Button>
            <Button type="button" variant="ghost" onClick={onClose}>
              ביטול
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
