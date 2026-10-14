"use client";

import { Button } from "@/components/ui/Button/Button";
import { FINANCIAL_SETTINGS_UI_COPY } from "@/modules/financial-settings/presentation/financial-settings-messages.he";
import styles from "@/modules/financial-settings/ui/FinancialSettingsAdmin.module.scss";

type ConfirmDiscardDialogProps = {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  pending: boolean;
  errorMessage?: string;
};

export function ConfirmDiscardDialog({
  open,
  onCancel,
  onConfirm,
  pending,
  errorMessage,
}: ConfirmDiscardDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div className={styles.dialogBackdrop} role="presentation">
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="discard-draft-title"
      >
        <h2 id="discard-draft-title" className={styles.dialogTitle}>
          {FINANCIAL_SETTINGS_UI_COPY.discardConfirmTitle}
        </h2>
        <p className={styles.hint}>{FINANCIAL_SETTINGS_UI_COPY.discardConfirmBody}</p>
        {errorMessage ? (
          <p className={styles.formError} role="alert">
            {errorMessage}
          </p>
        ) : null}
        <div className={styles.actions}>
          <Button type="button" variant="primary" disabled={pending} onClick={onConfirm}>
            {FINANCIAL_SETTINGS_UI_COPY.discardConfirmAction}
          </Button>
          <Button type="button" variant="ghost" disabled={pending} onClick={onCancel}>
            {FINANCIAL_SETTINGS_UI_COPY.discardConfirmCancel}
          </Button>
        </div>
      </div>
    </div>
  );
}
