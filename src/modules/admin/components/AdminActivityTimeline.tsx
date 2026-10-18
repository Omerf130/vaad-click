import Link from "next/link";

import type { AdminActivityEntry } from "@/modules/admin/services/admin-activity.service";
import styles from "@/modules/admin/dashboard/admin-dashboard.module.scss";

type Props = {
  items: AdminActivityEntry[];
  linkDebtCases?: boolean;
};

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString("he-IL", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function resolveHref(entry: AdminActivityEntry): string | null {
  if (entry.targetEntityType === "debt_case" && entry.targetEntityId) {
    return `/app/admin/debt-cases/${entry.targetEntityId}`;
  }
  if (entry.targetEntityType === "building" && entry.targetEntityId) {
    return `/app/admin/buildings/${entry.targetEntityId}`;
  }
  if (entry.targetEntityType === "user" && entry.targetEntityId) {
    return `/app/admin/users/${entry.targetEntityId}`;
  }
  return null;
}

export function AdminActivityTimeline({ items, linkDebtCases = true }: Props) {
  if (items.length === 0) {
    return <p className={styles.emptyActivity}>אין פעילות להצגה.</p>;
  }

  return (
    <ul className={styles.activityList}>
      {items.map((entry) => {
        const href = linkDebtCases ? resolveHref(entry) : null;
        return (
          <li key={`${entry.eventType}-${entry.occurredAtIso}-${entry.targetEntityId}`} className={styles.activityItem}>
            <div className={styles.activityMain}>
              <p className={styles.activityTitle}>{entry.titleHe}</p>
              <p className={styles.activityMeta}>{formatWhen(entry.occurredAtIso)}</p>
              {entry.detailHe ? <p className={styles.activityDetail}>{entry.detailHe}</p> : null}
            </div>
            {href ? (
              <Link href={href} className={styles.activityLink}>
                פרטים
              </Link>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
