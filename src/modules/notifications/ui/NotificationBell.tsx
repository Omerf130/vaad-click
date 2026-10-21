"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import {
  fetchNotificationsAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/modules/notifications/actions/notification.actions";
import { formatNotificationDateTimeHe } from "@/modules/notifications/presentation/format-notification-datetime.he";
import type { NotificationListItem } from "@/modules/notifications/services/notification-query.service";
import styles from "@/modules/notifications/ui/NotificationBell.module.scss";

type Props = {
  initialUnreadCount: number;
  fullListHref: string;
};

export function NotificationBell({ initialUnreadCount, fullListHref }: Props) {
  const panelId = useId();
  const router = useRouter();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [items, setItems] = useState<NotificationListItem[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchNotificationsAction(15);
      if (result.ok) {
        setItems(result.items);
        setUnreadCount(result.unreadCount);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    function onDocClick(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  function handleOpenToggle() {
    const willOpen = !open;
    setOpen(willOpen);
    if (willOpen) {
      void refresh();
    }
  }

  async function handleItemClick(item: NotificationListItem) {
    if (!item.readAtIso) {
      await markNotificationReadAction(item.notificationId);
      setUnreadCount((count) => Math.max(0, count - 1));
    }
    setOpen(false);
    router.push(item.destinationPath);
  }

  async function handleMarkAllRead() {
    await markAllNotificationsReadAction();
    setUnreadCount(0);
    setItems((prev) => prev.map((row) => ({ ...row, readAtIso: row.readAtIso ?? new Date().toISOString() })));
  }

  const unreadLabel =
    unreadCount > 0 ? `${unreadCount} התראות שלא נקראו` : "אין התראות שלא נקראו";

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <button
        type="button"
        className={styles.trigger}
        aria-label={unreadLabel}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => void handleOpenToggle()}
      >
        <span className={styles.icon} aria-hidden>
          🔔
        </span>
        {unreadCount > 0 ? (
          <span className={styles.badge} aria-hidden>
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div id={panelId} className={styles.panel} role="region" aria-label="התראות">
          <div className={styles.panelHeader}>
            <span>התראות</span>
            <div className={styles.panelActions}>
              <button type="button" className={styles.linkButton} onClick={() => void handleMarkAllRead()}>
                סימון הכל כנקרא
              </button>
            </div>
          </div>
          {loading ? (
            <p className={styles.empty} role="status" aria-live="polite">
              טוען…
            </p>
          ) : null}
          {!loading && items.length === 0 ? (
            <p className={styles.empty} role="status">
              אין התראות להצגה.
            </p>
          ) : (
            <ul className={styles.list}>
              {items.map((item) => {
                const unread = !item.readAtIso;
                return (
                  <li
                    key={item.notificationId}
                    className={unread ? `${styles.item} ${styles.itemUnread}` : styles.item}
                  >
                    <button
                      type="button"
                      className={styles.itemLink}
                      onClick={() => void handleItemClick(item)}
                    >
                      <div className={styles.itemTitleRow}>
                        <p className={styles.itemTitle}>{item.titleHe}</p>
                        {unread ? (
                          <span className={styles.unreadBadge} aria-hidden>
                            חדש
                          </span>
                        ) : null}
                      </div>
                      <p className={styles.itemBody}>{item.bodyHe}</p>
                      <p className={styles.itemMeta}>
                        <time dateTime={item.createdAtIso}>
                          {formatNotificationDateTimeHe(item.createdAtIso)}
                        </time>
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <div className={styles.panelFooter}>
            <Link href={fullListHref} onClick={() => setOpen(false)}>
              כל ההתראות
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
