import Link from "next/link";

import type { OperatorDebtCaseActivityEntry } from "@/modules/portal/services/operator-debt-case-activity.service";
import styles from "@/modules/portal/ui/OperatorPortalDashboard.module.scss";

type Props = {
  items: OperatorDebtCaseActivityEntry[];
  showBuildingName?: boolean;
  buildingNames?: Map<string, string>;
};

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString("he-IL", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function OperatorRecentActivityList({
  items,
  showBuildingName = false,
  buildingNames,
}: Props) {
  if (items.length === 0) {
    return <p className={styles.emptyState}>אין פעילות אחרונה להצגה.</p>;
  }

  return (
    <ul className={styles.activityList}>
      {items.map((item) => (
        <li key={`${item.debtCaseId}-${item.occurredAtIso}-${item.eventType}`} className={styles.activityItem}>
          <div className={styles.activityMain}>
            <p className={styles.activityTitle}>{item.titleHe}</p>
            <p className={styles.activityMeta}>
              {showBuildingName && buildingNames?.get(item.buildingId)
                ? `${buildingNames.get(item.buildingId)} · `
                : ""}
              {formatWhen(item.occurredAtIso)}
            </p>
            {item.detailHe ? <p className={styles.activityDetail}>{item.detailHe}</p> : null}
          </div>
          <Link href={`/app/buildings/${item.buildingId}/debt-cases/${item.debtCaseId}`}>
            לתיק
          </Link>
        </li>
      ))}
    </ul>
  );
}
