"use client";

import type { ReactNode } from "react";

import { Button } from "@/components/ui/Button/Button";
import styles from "@/modules/admin/components/AdminConfirmDialog.module.scss";

export type AdminConfirmDialogProps = {
  open: boolean;
  title: string;
  body: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  pending?: boolean;
  destructive?: boolean;
  errorMessage?: string;
};

export function AdminConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  pending = false,
  destructive = false,
  errorMessage,
}: AdminConfirmDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div className={styles.backdrop} role="presentation" onClick={onCancel}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-confirm-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="admin-confirm-title" className={styles.title}>
          {title}
        </h2>
        <div className={styles.body}>{body}</div>
        {errorMessage ? (
          <p className={styles.error} role="alert">
            {errorMessage}
          </p>
        ) : null}
        <div className={styles.actions}>
          <Button
            type="button"
            variant={destructive ? "primary" : "primary"}
            disabled={pending}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
          <Button type="button" variant="ghost" disabled={pending} onClick={onCancel}>
            {cancelLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
