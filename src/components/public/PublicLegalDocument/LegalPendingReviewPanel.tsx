import {
  accessibilityPendingFieldLabels,
  accessibilityStatementPendingReview,
} from "@/content/legal/legal-publication-config";
import styles from "./LegalPendingReviewPanel.module.scss";

type Props = {
  title?: string;
};

export function LegalPendingReviewPanel({
  title = "פרטים ממתינים לאימות / אישור",
}: Props) {
  const entries = Object.entries(accessibilityStatementPendingReview) as [
    keyof typeof accessibilityStatementPendingReview,
    string | null,
  ][];

  return (
    <aside className={styles.panel} aria-labelledby="legal-pending-review-heading">
      <h2 id="legal-pending-review-heading" className={styles.title}>
        {title}
      </h2>
      <p className={styles.lead}>
        הפריטים הבאים מופיעים בהצהרת הנגישות המאושרת וטרם הושלמו במערכת. אין
        להציג ערכים מומצאים לפני אישור עורך הדין / בדיקה ידנית.
      </p>
      <dl className={styles.list}>
        {entries.map(([key, value]) => (
          <div key={key} className={styles.row}>
            <dt>{accessibilityPendingFieldLabels[key]}</dt>
            <dd>
              {value ?? (
                <span className={styles.pending}>ממתין לעדכון מאושר</span>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}
