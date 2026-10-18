"use server";

import {
  countUnreadNotifications,
  listNotificationsForUser,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/modules/notifications/services/notification-query.service";
import { requireAuthenticatedPortalSession } from "@/shared/auth/require-access";

export async function fetchNotificationsAction(limit?: number) {
  const context = await requireAuthenticatedPortalSession();
  const [items, unreadCount] = await Promise.all([
    listNotificationsForUser({ context, limit }),
    countUnreadNotifications(context),
  ]);
  return { ok: true as const, items, unreadCount };
}

export async function markNotificationReadAction(notificationId: string) {
  const context = await requireAuthenticatedPortalSession();
  await markNotificationRead({ context, notificationId });
  return { ok: true as const };
}

export async function markAllNotificationsReadAction() {
  const context = await requireAuthenticatedPortalSession();
  await markAllNotificationsRead(context);
  return { ok: true as const };
}
