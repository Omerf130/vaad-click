import Link from "next/link";

import {
  listNotificationsForUser,
} from "@/modules/notifications/services/notification-query.service";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import styles from "@/modules/notifications/ui/NotificationBell.module.scss";

type Props = {
  context: AuthenticatedContext;
};

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString("he-IL", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export async function NotificationsListPanel({ context }: Props) {
  const items = await listNotificationsForUser({ context, limit: 50 });

  if (items.length === 0) {
    return <p className={styles.empty}>אין התראות להצגה.</p>;
  }

  return (
    <ul className={styles.list}>
      {items.map((item) => (
        <li
          key={item.notificationId}
          className={item.readAtIso ? styles.item : `${styles.item} ${styles.itemUnread}`}
        >
          <Link href={item.destinationPath} className={styles.itemLink}>
            <p className={styles.itemTitle}>
              {!item.readAtIso ? "● " : null}
              {item.titleHe}
            </p>
            <p className={styles.itemBody}>{item.bodyHe}</p>
            <p className={styles.itemMeta}>{formatWhen(item.createdAtIso)}</p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
