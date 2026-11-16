"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/Button/Button";
import { WARNING_LETTER_OPERATIVE_DEADLINE_POLICY_SUMMARY_HE } from "@/modules/warning-letters/domain/warning-letter-operative-deadline-policy";
import {
  confirmOperativeDeadlinePolicyFormAction,
  type WarningLetterLifecycleActionState,
} from "@/modules/warning-letters/actions/lawyer-warning-letter-lifecycle.actions";
import type { OperativeDeadlinePolicyConfirmationView } from "@/modules/warning-letters/services/warning-letter-operative-deadline-policy.service";
import styles from "@/modules/warning-letters/ui/WarningLetterPreviewPanel.module.scss";

type Props = {
  confirmation: OperativeDeadlinePolicyConfirmationView | null;
  debtCaseId?: string;
};

const initialState: WarningLetterLifecycleActionState = { ok: false };

export function WarningLetterOperativeDeadlinePolicyPanel({ confirmation, debtCaseId }: Props) {
  const [state, dispatchConfirm, isPending] = useActionState(
    confirmOperativeDeadlinePolicyFormAction,
    initialState,
  );

  return (
    <section className={styles.section} aria-labelledby="wl-deadline-policy-title">
      <h3 id="wl-deadline-policy-title" className={styles.sectionTitle}>
        מדיניות מועד לתשלום — אישור עורך דין (ממתין להכרעה סופית)
      </h3>
      <p className={styles.metaLine}>{WARNING_LETTER_OPERATIVE_DEADLINE_POLICY_SUMMARY_HE}</p>
      <p className={styles.incompleteWarning}>
        אישור זה מאפשר חישוב מבצעי בלבד; אין בו קביעה משפטית חלוטה עד לאישור סופי של ההנהלה המשפטית.
      </p>
      {state.message ? (
        <p className={state.ok ? styles.bannerSuccess : styles.incompleteWarning} role="status">
          {state.message}
        </p>
      ) : null}
      {confirmation ? (
        <p className={styles.bannerSuccess}>
          אושרה במערכת ב-
          {new Date(confirmation.confirmedAtIso).toLocaleString("he-IL")} · מזהה מדיניות{" "}
          {confirmation.policyId}
        </p>
      ) : (
        <form action={dispatchConfirm} className={styles.inlineForm}>
          {debtCaseId ? <input type="hidden" name="debtCaseId" value={debtCaseId} /> : null}
          <Button type="submit" variant="primary" size="sm" disabled={isPending}>
            אישור מדיניות המועד לסגירת מסמך סופי
          </Button>
        </form>
      )}
    </section>
  );
}