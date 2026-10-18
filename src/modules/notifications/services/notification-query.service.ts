import "server-only";

import { Types } from "mongoose";

import { NotificationEntityType } from "@/modules/notifications/domain/notification-event-type";
import { Notification } from "@/modules/notifications/infra/notification.model";
import { assertCanAccessNotificationDestination } from "@/modules/notifications/services/notification-destination.service";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import { connectMongo } from "@/shared/db/connect";

export type NotificationListItem = {
  notificationId: string;
  eventType: string;
  titleHe: string;
  bodyHe: string;
  entityType: string;
  entityId: string;
  destinationPath: string;
  readAtIso: string | null;
  createdAtIso: string;
};

export async function countUnreadNotifications(context: AuthenticatedContext): Promise<number> {
  await connectMongo();
  return Notification.countDocuments({
    recipientUserId: new Types.ObjectId(context.user.id),
    readAt: null,
  });
}

export async function listNotificationsForUser(input: {
  context: AuthenticatedContext;
  limit?: number;
}): Promise<NotificationListItem[]> {
  await connectMongo();
  const limit = Math.min(Math.max(input.limit ?? 20, 1), 50);
  const rows = await Notification.find({
    recipientUserId: new Types.ObjectId(input.context.user.id),
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  const items: NotificationListItem[] = [];
  for (const row of rows) {
    const destinationPath = await assertCanAccessNotificationDestination({
      context: input.context,
      entityType: row.entityType as (typeof NotificationEntityType)[keyof typeof NotificationEntityType],
      entityId: row.entityId,
      buildingId: row.buildingId,
      fallbackPath: row.destinationPath,
    });
    items.push({
      notificationId: row.notificationId,
      eventType: row.eventType,
      titleHe: row.titleHe,
      bodyHe: row.bodyHe,
      entityType: row.entityType,
      entityId: row.entityId,
      destinationPath,
      readAtIso: row.readAt ? row.readAt.toISOString() : null,
      createdAtIso: row.createdAt.toISOString(),
    });
  }
  return items;
}

export async function markNotificationRead(input: {
  context: AuthenticatedContext;
  notificationId: string;
}): Promise<void> {
  await connectMongo();
  await Notification.updateOne(
    {
      notificationId: input.notificationId,
      recipientUserId: new Types.ObjectId(input.context.user.id),
    },
    { $set: { readAt: new Date() } },
  );
}

export async function markAllNotificationsRead(context: AuthenticatedContext): Promise<void> {
  await connectMongo();
  await Notification.updateMany(
    {
      recipientUserId: new Types.ObjectId(context.user.id),
      readAt: null,
    },
    { $set: { readAt: new Date() } },
  );
}
