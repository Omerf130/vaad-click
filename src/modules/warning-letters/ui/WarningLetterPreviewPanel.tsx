import type { WarningLetterContentSnapshot } from "@/modules/warning-letters/snapshot/warning-letter-snapshot.types";
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
  return (
    <section className={styles.previewSection} aria-labelledby="warning-letter-preview-title">
      <h2 id="warning-letter-preview-title" className={styles.previewTitle}>
        תצוגה מקדימה — מכתב התראה
      </h2>
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
