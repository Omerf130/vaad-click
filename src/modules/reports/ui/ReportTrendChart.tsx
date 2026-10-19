import type { ReportSubmissionTrendPoint } from "@/modules/reports/services/report-debt-case-query.service";
import styles from "@/modules/reports/ui/Reports.module.scss";

type Props = {
  title: string;
  noteHe: string;
  points: ReportSubmissionTrendPoint[];
};

export function ReportTrendChart({ title, noteHe, points }: Props) {
  const max = points.reduce((m, p) => Math.max(m, p.count), 0) || 1;

  return (
    <section className={styles.chartBlock} aria-labelledby="report-trend-title">
      <h3 id="report-trend-title">{title}</h3>
      <p className={styles.sectionNote}>{noteHe}</p>
      {points.length === 0 ? (
        <p className={styles.sectionNote}>אין הגשות בטווח הנבחר.</p>
      ) : (
        <div role="list" aria-label={title}>
          {points.map((point) => (
            <div key={point.periodKey} className={styles.barRow} role="listitem">
              <span>{point.labelHe}</span>
              <div className={styles.barTrack} aria-hidden>
                <div
                  className={styles.barFill}
                  style={{ width: `${Math.round((point.count / max) * 100)}%` }}
                />
              </div>
              <span>{point.count}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
