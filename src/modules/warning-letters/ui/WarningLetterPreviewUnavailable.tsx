import styles from "@/modules/warning-letters/ui/WarningLetterPreviewPanel.module.scss";

type Props = {
  messageHe: string;
};

export function WarningLetterPreviewUnavailable({ messageHe }: Props) {
  return (
    <section className={styles.previewSection} aria-labelledby="warning-letter-preview-unavailable">
      <h2 id="warning-letter-preview-unavailable" className={styles.previewTitle}>
        תצוגה מקדימה — מכתב התראה
      </h2>
      <p className={styles.errorBanner} role="status">
        {messageHe}
      </p>
    </section>
  );
}
