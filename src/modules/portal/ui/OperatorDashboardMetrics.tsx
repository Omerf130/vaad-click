import type { OperatorDebtCaseMetrics } from "@/modules/portal/services/operator-portal-dashboard.service";
import styles from "@/modules/portal/ui/OperatorPortalDashboard.module.scss";

type Props = {
  metrics: OperatorDebtCaseMetrics;
};

export function OperatorDashboardMetrics({ metrics }: Props) {
  const items = [
    { label: "סה״כ תיקי חוב", value: metrics.totalDebtCases },
    { label: "ממתינים לבדיקת עורך דין", value: metrics.pendingLawyerReview },
    { label: "הוחזרו להשלמה", value: metrics.returnedForCompletion },
    { label: "אושרו להכנת מכתב", value: metrics.approvedForLetterPrep },
  ];

  return (
    <div className={styles.metricsGrid}>
      {items.map((item) => (
        <div key={item.label} className={styles.metricCard}>
          <p className={styles.metricValue}>{item.value}</p>
          <p className={styles.metricLabel}>{item.label}</p>
        </div>
      ))}
    </div>
  );
}
