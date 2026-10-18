import "server-only";

import { randomUUID } from "node:crypto";

import { Types, type ClientSession } from "mongoose";

import {
  NotificationEntityType,
  type NotificationEventType,
} from "@/modules/notifications/domain/notification-event-type";
import { Notification } from "@/modules/notifications/infra/notification.model";
import { connectMongo } from "@/shared/db/connect";

export type NotificationInsertInput = {
  recipientUserId: string;
  eventType: NotificationEventType;
  titleHe: string;
  bodyHe: string;
  entityType: (typeof NotificationEntityType)[keyof typeof NotificationEntityType];
  entityId: string;
  buildingId?: string | null;
  destinationPath: string;
  idempotencyKey: string;
};

export async function insertNotificationsIdempotent(input: {
  notifications: NotificationInsertInput[];
  session?: ClientSession;
}): Promise<void> {
  if (input.notifications.length === 0) {
    return;
  }

  await connectMongo();

  for (const row of input.notifications) {
    try {
      await Notification.create(
        [
          {
            notificationId: randomUUID(),
            recipientUserId: new Types.ObjectId(row.recipientUserId),
            eventType: row.eventType,
            titleHe: row.titleHe,
            bodyHe: row.bodyHe,
            entityType: row.entityType,
            entityId: row.entityId,
            buildingId: row.buildingId ?? null,
            destinationPath: row.destinationPath,
            idempotencyKey: row.idempotencyKey,
            readAt: null,
          },
        ],
        input.session ? { session: input.session } : undefined,
      );
    } catch (error) {
      const code =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: number }).code;
      if (code === 11000) {
        continue;
      }
      throw error;
    }
  }
}
