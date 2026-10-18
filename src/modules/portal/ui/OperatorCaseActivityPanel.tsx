import type { OperatorDebtCaseActivityEntry } from "@/modules/portal/services/operator-debt-case-activity.service";
import { OperatorRecentActivityList } from "@/modules/portal/ui/OperatorRecentActivityList";
import styles from "@/modules/portal/ui/OperatorPortalDashboard.module.scss";

type Props = {
  activity: OperatorDebtCaseActivityEntry[];
  embedded?: boolean;
};

export function OperatorCaseActivityPanel({ activity, embedded = false }: Props) {
  if (embedded) {
    return <OperatorRecentActivityList items={activity} />;
  }

  return (
    <section className={styles.section} aria-labelledby="case-activity-title">
      <h2 id="case-activity-title" className={styles.sectionTitle}>
        היסטוריית פעילות
      </h2>
      <OperatorRecentActivityList items={activity} />
    </section>
  );
}
