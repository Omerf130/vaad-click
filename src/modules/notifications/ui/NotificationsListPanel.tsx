import Link from "next/link";

import { listNotificationsForUser } from "@/modules/notifications/services/notification-query.service";
import { formatNotificationDateTimeHe } from "@/modules/notifications/presentation/format-notification-datetime.he";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import styles from "@/modules/notifications/ui/NotificationBell.module.scss";
import pageStyles from "@/modules/notifications/ui/NotificationsPageFrame.module.scss";

type Props = {
  context: AuthenticatedContext;
};

export async function NotificationsListPanel({ context }: Props) {
  const items = await listNotificationsForUser({ context, limit: 50 });

  if (items.length === 0) {
    return (
      <p className={pageStyles.intro} role="status">
        אין התראות להצגה. עדכונים על פעולות במערכת יופיעו כאן.
      </p>
    );
  }

  return (
    <ul className={styles.listPageList} aria-label="רשימת התראות">
      {items.map((item) => {
        const unread = !item.readAtIso;
        return (
          <li
            key={item.notificationId}
            className={unread ? `${styles.item} ${styles.itemUnread}` : styles.item}
          >
            <Link href={item.destinationPath} className={styles.itemLink}>
              <div className={styles.itemTitleRow}>
                <p className={styles.itemTitle}>{item.titleHe}</p>
                {unread ? (
                  <span className={styles.unreadBadge} aria-label="לא נקרא">
                    חדש
                  </span>
                ) : null}
              </div>
              <p className={styles.itemBody}>{item.bodyHe}</p>
              <p className={styles.itemMeta}>
                <time dateTime={item.createdAtIso}>{formatNotificationDateTimeHe(item.createdAtIso)}</time>
                <span className={styles.itemDestination} aria-hidden>
                  ·
                </span>
                <span className={styles.itemDestination}>מעבר ליעד</span>
              </p>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
