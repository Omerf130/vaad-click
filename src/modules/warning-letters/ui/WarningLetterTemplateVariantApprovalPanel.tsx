"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/Button/Button";
import {
  approveWarningLetterTemplateVariantFormAction,
  type WarningLetterLifecycleActionState,
} from "@/modules/warning-letters/actions/lawyer-warning-letter-lifecycle.actions";
import type { TemplateVariantCatalogRow } from "@/modules/warning-letters/services/warning-letter-template-variant-approval.service";
import styles from "@/modules/warning-letters/ui/WarningLetterPreviewPanel.module.scss";

type Props = {
  rows: TemplateVariantCatalogRow[];
  debtCaseId?: string;
};

const initialState: WarningLetterLifecycleActionState = { ok: false };

export function WarningLetterTemplateVariantApprovalPanel({ rows, debtCaseId }: Props) {
  const [state, dispatchApprove, isPending] = useActionState(
    approveWarningLetterTemplateVariantFormAction,
    initialState,
  );

  return (
    <section className={styles.section} aria-labelledby="wl-template-variants-title">
      <h3 id="wl-template-variants-title" className={styles.sectionTitle}>
        אישור גרסאות ניסוח תבנית (גלובלי)
      </h3>
      {state.message ? (
        <p className={state.ok ? styles.bannerSuccess : styles.incompleteWarning} role="status">
          {state.message}
        </p>
      ) : null}
      <ul className={styles.variantList}>
        {rows.map((row) => (
          <li key={row.variantId} className={styles.variantCard}>
            <h4 className={styles.variantTitle}>{row.titleHe}</h4>
            <p className={styles.metaLine}>{row.scenarioHe}</p>
            <pre className={styles.variantWording}>{row.wordingHe}</pre>
            {row.approved ? (
              <p className={styles.bannerSuccess}>
                אושר{" "}
                {row.approvedAtIso
                  ? new Date(row.approvedAtIso).toLocaleString("he-IL")
                  : ""}
              </p>
            ) : row.requiresLawyerClarification ? (
              <p className={styles.incompleteWarning}>נדרשת הבהרה משפטית — אין ניסוח סמכותי.</p>
            ) : (
              <form action={dispatchApprove} className={styles.inlineForm}>
                <input type="hidden" name="variantId" value={row.variantId} />
                <input type="hidden" name="templateVersionId" value={row.templateVersionId} />
                {debtCaseId ? <input type="hidden" name="debtCaseId" value={debtCaseId} /> : null}
                <Button type="submit" variant="primary" size="sm" disabled={isPending}>
                  אישור הניסוח המדויק
                </Button>
              </form>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
