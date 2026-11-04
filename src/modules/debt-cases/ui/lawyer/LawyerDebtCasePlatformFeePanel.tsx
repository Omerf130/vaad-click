"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/Button/Button";
import {
  updatePlatformFeeCollectionStatusAction,
  type PlatformFeeActionState,
} from "@/modules/debt-cases/actions/admin-debt-case-platform-fee.actions";
import type { DebtCaseRecord } from "@/modules/debt-cases/domain/debt-case-record.types";
import { WarningLetterPlatformFeePaymentPreference } from "@/modules/debt-cases/domain/warning-letter-platform-fee-payment-preference";
import {
  formatPlatformFeeCollectionStatusHe,
  formatPlatformFeePaymentPreferenceHe,
  formatWarningLetterPlatformFeeAmountHe,
  WARNING_LETTER_PLATFORM_FEE_ONLINE_UNAVAILABLE_HE,
} from "@/modules/debt-cases/presentation/warning-letter-platform-fee.he";
import { LAWYER_ALLOWED_PLATFORM_FEE_STATUS_TRANSITIONS } from "@/modules/debt-cases/domain/warning-letter-platform-fee-collection-status";
import styles from "@/modules/debt-cases/ui/lawyer/LawyerDebtCasesAdmin.module.scss";

type Props = {
  record: DebtCaseRecord;
  canUpdate: boolean;
};

const initial: PlatformFeeActionState = { ok: false };

export function LawyerDebtCasePlatformFeePanel({ record, canUpdate }: Props) {
  const [state, formAction, pending] = useActionState(updatePlatformFeeCollectionStatusAction, initial);

  if (!record.platformFeePreference) {
    return (
      <section className={styles.caseSummaryCard} aria-labelledby="platform-fee-title">
        <h2 id="platform-fee-title" className={styles.caseSummaryTitle}>
          תשלום מכתב התראה
        </h2>
        <p className={styles.sectionHint}>תיק ללא העדפת תשלום (legacy).</p>
      </section>
    );
  }

  const current = record.platformFeeCollectionStatus;
  const allowed =
    current != null ? (LAWYER_ALLOWED_PLATFORM_FEE_STATUS_TRANSITIONS[current] ?? []) : [];

  return (
    <section className={styles.caseSummaryCard} aria-labelledby="platform-fee-title">
      <h2 id="platform-fee-title" className={styles.caseSummaryTitle}>
        תשלום מכתב התראה
      </h2>
      <dl className={styles.summaryGrid}>
        <div>
          <dt>עמלה</dt>
          <dd>{formatWarningLetterPlatformFeeAmountHe(record.platformFeeAmountMinor)}</dd>
        </div>
        <div>
          <dt>העדפת לקוח</dt>
          <dd>{formatPlatformFeePaymentPreferenceHe(record.platformFeePreference)}</dd>
        </div>
        <div>
          <dt>סטטוס גבייה / תשלום</dt>
          <dd>{formatPlatformFeeCollectionStatusHe(record.platformFeeCollectionStatus)}</dd>
        </div>
      </dl>
      {record.platformFeePreference === WarningLetterPlatformFeePaymentPreference.IMMEDIATE_PAYMENT ? (
        <p className={styles.sectionHint} role="note">
          {WARNING_LETTER_PLATFORM_FEE_ONLINE_UNAVAILABLE_HE}
        </p>
      ) : null}
      {record.platformFeeInternalNote ? (
        <p className={styles.sectionHint}>
          <strong>הערה פנימית:</strong> {record.platformFeeInternalNote}
        </p>
      ) : null}
      {record.platformFeeStatusHistory.length > 0 ? (
        <ul className={styles.activityList}>
          {record.platformFeeStatusHistory.map((entry, index) => (
            <li key={`${entry.updatedAtIso}-${index}`}>
              {formatPlatformFeeCollectionStatusHe(entry.fromStatus)} →{" "}
              {formatPlatformFeeCollectionStatusHe(entry.toStatus)}
              {entry.note ? ` · ${entry.note}` : ""}
            </li>
          ))}
        </ul>
      ) : null}
      {canUpdate && allowed.length > 0 ? (
        <form action={formAction} className={styles.fieldGrid}>
          <input type="hidden" name="debtCaseId" value={record.debtCaseId} />
          <label className={styles.label}>
            עדכון סטטוס
            <select name="nextStatus" className={styles.select} required defaultValue="">
              <option value="" disabled>
                בחרו סטטוס
              </option>
              {allowed.map((status) => (
                <option key={status} value={status}>
                  {formatPlatformFeeCollectionStatusHe(status)}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.label}>
            הערה פנימית (אופציונלי)
            <input name="internalNote" className={styles.input} maxLength={500} />
          </label>
          <Button type="submit" variant="secondary" size="sm" disabled={pending}>
            {pending ? "שומר…" : "עדכון סטטוס תשלום"}
          </Button>
          {state.message ? (
            <p className={state.ok ? styles.feedbackSuccess : styles.feedbackError} role="status">
              {state.message}
            </p>
          ) : null}
        </form>
      ) : null}
    </section>
  );
}
