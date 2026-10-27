import {
  describePaymentInstructionPreview,
  formatPaymentInstructionPreviewLabelHe,
  WARNING_LETTER_PAYMENT_INFRASTRUCTURE_NOTICE_HE,
} from "@/modules/warning-letters/templates/payment-instruction-clauses";
import type { WarningLetterContentSnapshot } from "@/modules/warning-letters/snapshot/warning-letter-snapshot.types";
import { WarningLetterMonetaryCompleteness } from "@/modules/warning-letters/domain/warning-letter-monetary-completeness";
import { WarningLetterDocumentView } from "@/modules/warning-letters/ui/WarningLetterDocumentView";
import styles from "@/modules/warning-letters/ui/WarningLetterPreviewPanel.module.scss";

type Props = {
  snapshot: WarningLetterContentSnapshot;
  contentSha256: string;
  previewWarningHe?: string | null;
  letterCaseReference?: string | null;
  /** When omitted, renders read-only document (same layout as edit mode). */
  mode?: "view" | "edit";
};

export function WarningLetterPreviewPanel({
  snapshot,
  contentSha256,
  previewWarningHe,
  letterCaseReference,
  mode = "view",
}: Props) {
  const includeTreatmentExpenses =
    snapshot.monetaryCompleteness === WarningLetterMonetaryCompleteness.COMPLETE &&
    snapshot.treatmentFeeGrossDisplay != null &&
    snapshot.numberedClauses.some((c) => c.clauseId === "treatment_expenses");
  const paymentPreviewLabel = formatPaymentInstructionPreviewLabelHe(
    describePaymentInstructionPreview({
      monetaryCompleteness: snapshot.monetaryCompleteness,
      treatmentFeeEligible:
        snapshot.numberedClauses.some((c) => c.clauseId === "treatment_expenses") ||
        snapshot.monetaryCompleteness ===
          WarningLetterMonetaryCompleteness.INCOMPLETE_MISSING_PUBLISHED_SETTINGS,
      includeTreatmentExpenses,
    }),
  );

  return (
    <section className={styles.previewSection} aria-labelledby="warning-letter-preview-title">
      <h2 id="warning-letter-preview-title" className={styles.previewTitle}>
        תצוגה מקדימה — מכתב התראה
      </h2>
      <p className={styles.metaLine} role="status">
        {paymentPreviewLabel}. {WARNING_LETTER_PAYMENT_INFRASTRUCTURE_NOTICE_HE}
      </p>
      {previewWarningHe ? (
        <p className={styles.incompleteWarning} role="status">
          {previewWarningHe}
        </p>
      ) : null}
      <p className={styles.metaLine}>
        {letterCaseReference ? (
          <>
            מספר תיק מכתב: <code>{letterCaseReference}</code>
            {" · "}
          </>
        ) : null}
        בדיקת שלמות (SHA-256): <code>{contentSha256.slice(0, 16)}…</code>
      </p>
      <div className={styles.previewFrame}>
        <div className={styles.documentShell}>
          <WarningLetterDocumentView snapshot={snapshot} mode={mode} />
        </div>
      </div>
    </section>
  );
}
