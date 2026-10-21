import type { ReportStatusBucket } from "@/modules/reports/services/report-debt-case-query.service";
import styles from "@/modules/reports/ui/Reports.module.scss";

type Props = {
  title: string;
  noteHe: string;
  buckets: ReportStatusBucket[];
};

export function ReportDistributionChart({ title, noteHe, buckets }: Props) {
  const max = buckets.reduce((m, b) => Math.max(m, b.count), 0) || 1;

  return (
    <section className={styles.chartBlock} aria-labelledby="report-distribution-title">
      <h3 id="report-distribution-title">{title}</h3>
      <p className={styles.sectionNote}>{noteHe}</p>
      {buckets.length === 0 ? (
        <p className={styles.sectionNote}>אין נתונים להצגה בטווח הנבחר.</p>
      ) : (
        <div role="list" aria-label={title}>
          {buckets.map((bucket) => (
            <div key={bucket.status} className={styles.barRow} role="listitem">
              <span>{bucket.labelHe}</span>
              <div
                className={styles.barTrack}
                role="img"
                aria-label={`${bucket.labelHe}: ${bucket.count} תיקים`}
              >
                <div
                  className={styles.barFill}
                  style={{ width: `${Math.round((bucket.count / max) * 100)}%` }}
                />
              </div>
              <span>{bucket.count}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
