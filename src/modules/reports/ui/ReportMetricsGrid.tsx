import type { ReportOverviewMetrics } from "@/modules/reports/services/report-debt-case-query.service";
import { formatMinorUnitsToNisDisplay } from "@/modules/debt-cases/presentation/debt-case-labels.he";
import styles from "@/modules/reports/ui/Reports.module.scss";

type Props = {
  metrics: ReportOverviewMetrics;
  showPendingApprovals?: number | null;
  rangeLabel: string;
  dateFieldLabel: string;
};

export function ReportMetricsGrid({
  metrics,
  showPendingApprovals,
  rangeLabel,
  dateFieldLabel,
}: Props) {
  const items: Array<{ label: string; value: string | number; hint?: string }> = [
    { label: "בניינים בדוח", value: metrics.accessibleBuildings },
    { label: "סה״כ תיקים (בטווח)", value: metrics.totalDebtCases, hint: dateFieldLabel },
    { label: "טיוטות", value: metrics.draftCases },
    {
      label: "ממתינים לבדיקת עורך דין",
      value: metrics.awaitingLawyerReview,
      hint: "הוגש לבדיקה, ללא החלטת עורך דין",
    },
    { label: "הוחזרו להשלמה", value: metrics.returnedForCompletion },
    { label: "אושרו להכנת מכתב", value: metrics.approvedForLetterPrep, hint: "לא אישור משפטי לשליחה" },
    { label: "נדחו", value: metrics.rejectedCases },
    {
      label: "הגשות חדשות (טווח)",
      value: metrics.newSubmissionsInRange,
      hint: "לפי תאריך הגשה",
    },
    {
      label: "סכום חוב רשום (₪)",
      value: formatMinorUnitsToNisDisplay(metrics.recordedDebtMinor),
      hint: `מ-${metrics.casesWithRecordedDebt} תיקים — לא גבייה בפועל`,
    },
  ];

  if (showPendingApprovals != null) {
    items.push({
      label: "הרשמות ממתינות לאישור",
      value: showPendingApprovals,
    });
  }

  return (
    <div>
      <p className={styles.sectionNote}>
        טווח: {rangeLabel}. ספירות סטטוס וסה״כ תיקים — לפי {dateFieldLabel}. «הגשות חדשות» וגרף
        ההגשות — תמיד לפי תאריך הגשה (submittedAt). סכומים — חוב רשום בתיק בלבד, לא גבייה.
      </p>
      <div className={styles.metricsGrid}>
        {items.map((item) => (
          <div key={item.label} className={styles.metricCard}>
            <p className={styles.metricValue}>{item.value}</p>
            <p className={styles.metricLabel}>{item.label}</p>
            {item.hint ? <p className={styles.metricHint}>{item.hint}</p> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
