import type { OperatorDebtCaseActivityEntry } from "@/modules/portal/services/operator-debt-case-activity.service";
import { OperatorRecentActivityList } from "@/modules/portal/ui/OperatorRecentActivityList";
import styles from "@/modules/portal/ui/OperatorPortalDashboard.module.scss";

type Props = {
  activity: OperatorDebtCaseActivityEntry[];
  returnFeedbackHe: string | null;
};

export function OperatorCaseActivityPanel({ activity, returnFeedbackHe }: Props) {
  return (
    <section className={styles.section} aria-labelledby="case-activity-title">
      <h2 id="case-activity-title" className={styles.sectionTitle}>
        היסטוריית פעילות
      </h2>
      {returnFeedbackHe ? (
        <div className={styles.feedbackCallout} role="status">
          <p className={styles.feedbackCalloutTitle}>הערת עורך דין להשלמה</p>
          <p>{returnFeedbackHe}</p>
        </div>
      ) : null}
      <OperatorRecentActivityList items={activity} />
    </section>
  );
}
