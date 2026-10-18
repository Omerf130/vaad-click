import "server-only";

import type { ClientSession } from "mongoose";

import { NotificationEntityType, NotificationEventType } from "@/modules/notifications/domain/notification-event-type";
import {
  insertNotificationsIdempotent,
  type NotificationInsertInput,
} from "@/modules/notifications/services/notification-write.service";
import {
  listActiveLawyerAdminUserIds,
  listManagementCompanyRecipientUserIds,
  listOperatorRecipientUserIdsForBuilding,
} from "@/modules/notifications/services/notification-recipients.service";

function lawyerAdminQueuePath(): string {
  return "/app/admin/users?view=pending";
}

function lawyerDebtCasePath(debtCaseId: string): string {
  return `/app/admin/debt-cases/${debtCaseId}`;
}

function operatorDebtCasePath(buildingId: string, debtCaseId: string): string {
  return `/app/buildings/${buildingId}/debt-cases/${debtCaseId}`;
}

function lawyerBuildingPath(buildingId: string): string {
  return `/app/admin/buildings/${buildingId}`;
}

function operatorBuildingPath(buildingId: string): string {
  return `/app/buildings/${buildingId}`;
}

function accountStatusPath(): string {
  return "/app/account-status";
}

function mapForRecipients(
  recipientUserIds: string[],
  base: Omit<NotificationInsertInput, "recipientUserId" | "idempotencyKey">,
  idempotencyKeyFor: (recipientUserId: string) => string,
): NotificationInsertInput[] {
  return recipientUserIds.map((recipientUserId) => ({
    ...base,
    recipientUserId,
    idempotencyKey: idempotencyKeyFor(recipientUserId),
  }));
}

export async function notifyLawyerAdminsAccountRegistrationPending(input: {
  registeredUserId: string;
  registeredUserFullName: string;
  session?: ClientSession;
}): Promise<void> {
  const recipients = await listActiveLawyerAdminUserIds();
  const rows = mapForRecipients(
    recipients,
    {
      eventType: NotificationEventType.ACCOUNT_REGISTRATION_PENDING,
      titleHe: "הרשמה חדשה ממתינה",
      bodyHe: `נרשם/ה חשבון חדש: ${input.registeredUserFullName.trim() || "משתמש/ת"}.`,
      entityType: NotificationEntityType.ADMIN_QUEUE,
      entityId: input.registeredUserId,
      destinationPath: lawyerAdminQueuePath(),
    },
    (recipientUserId) =>
      `account_registration_pending:${input.registeredUserId}:${recipientUserId}`,
  );
  await insertNotificationsIdempotent({ notifications: rows, session: input.session });
}

export async function notifyUserAccountApproved(input: {
  targetUserId: string;
  session?: ClientSession;
}): Promise<void> {
  await insertNotificationsIdempotent({
    session: input.session,
    notifications: [
      {
        recipientUserId: input.targetUserId,
        eventType: NotificationEventType.ACCOUNT_APPROVED,
        titleHe: "החשבון אושר",
        bodyHe: "ניתן להתחיל לעבוד במערכת לאחר השלמת שיוך ארגוני, אם נדרש.",
        entityType: NotificationEntityType.USER,
        entityId: input.targetUserId,
        destinationPath: "/app",
        idempotencyKey: `account_approved:${input.targetUserId}`,
      },
    ],
  });
}

export async function notifyUserAccountRejected(input: {
  targetUserId: string;
  session?: ClientSession;
}): Promise<void> {
  await insertNotificationsIdempotent({
    session: input.session,
    notifications: [
      {
        recipientUserId: input.targetUserId,
        eventType: NotificationEventType.ACCOUNT_REJECTED,
        titleHe: "החשבון נדחה",
        bodyHe: "בקשת ההרשמה לא אושרה. לפרטים פנו למשרד.",
        entityType: NotificationEntityType.USER,
        entityId: input.targetUserId,
        destinationPath: accountStatusPath(),
        idempotencyKey: `account_rejected:${input.targetUserId}`,
      },
    ],
  });
}

export async function notifyLawyerAdminsDebtCaseSubmitted(input: {
  debtCaseId: string;
  buildingId: string;
  revision: number;
  apartmentLabel: string;
  resubmitted: boolean;
  session?: ClientSession;
}): Promise<void> {
  const recipients = await listActiveLawyerAdminUserIds();
  const eventType = input.resubmitted
    ? NotificationEventType.DEBT_CASE_RESUBMITTED
    : NotificationEventType.DEBT_CASE_SUBMITTED;
  const titleHe = input.resubmitted ? "תיק חוב הוגש מחדש" : "תיק חוב הוגש לבדיקה";
  const bodyHe = input.resubmitted
    ? `תיק דירה ${input.apartmentLabel} הוגש מחדש לבדיקת עורך דין.`
    : `תיק חדש לדירה ${input.apartmentLabel} ממתין לבדיקת עורך דין.`;

  const rows = mapForRecipients(
    recipients,
    {
      eventType,
      titleHe,
      bodyHe,
      entityType: NotificationEntityType.DEBT_CASE,
      entityId: input.debtCaseId,
      buildingId: input.buildingId,
      destinationPath: lawyerDebtCasePath(input.debtCaseId),
    },
    (recipientUserId) =>
      `${eventType}:${input.debtCaseId}:${input.revision}:${recipientUserId}`,
  );
  await insertNotificationsIdempotent({ notifications: rows, session: input.session });
}

export async function notifyOperatorsDebtCaseReviewOutcome(input: {
  debtCaseId: string;
  buildingId: string;
  revision: number;
  apartmentLabel: string;
  outcome: "approved" | "returned" | "rejected";
  submitterUserId?: string | null;
  session?: ClientSession;
}): Promise<void> {
  const recipients = await listOperatorRecipientUserIdsForBuilding({
    buildingId: input.buildingId,
    extraUserIds: input.submitterUserId ? [input.submitterUserId] : undefined,
  });

  const config = {
    approved: {
      eventType: NotificationEventType.DEBT_CASE_APPROVED,
      titleHe: "תיק חוב אושר",
      bodyHe: `תיק דירה ${input.apartmentLabel} אושר להמשך טיפול במשרד.`,
    },
    returned: {
      eventType: NotificationEventType.DEBT_CASE_RETURNED,
      titleHe: "נדרשת השלמת תיק חוב",
      bodyHe: `תיק דירה ${input.apartmentLabel} הוחזר להשלמת פרטים — פרטים בדף התיק.`,
    },
    rejected: {
      eventType: NotificationEventType.DEBT_CASE_REJECTED,
      titleHe: "תיק חוב נדחה",
      bodyHe: `תיק דירה ${input.apartmentLabel} נדחה. פנו למשרד לפרטים.`,
    },
  }[input.outcome];

  const rows = mapForRecipients(
    recipients,
    {
      eventType: config.eventType,
      titleHe: config.titleHe,
      bodyHe: config.bodyHe,
      entityType: NotificationEntityType.DEBT_CASE,
      entityId: input.debtCaseId,
      buildingId: input.buildingId,
      destinationPath: operatorDebtCasePath(input.buildingId, input.debtCaseId),
    },
    (recipientUserId) =>
      `${config.eventType}:${input.debtCaseId}:${input.revision}:${recipientUserId}`,
  );
  await insertNotificationsIdempotent({ notifications: rows, session: input.session });
}

export async function notifyLawyerAdminsBuildingCreatedByMc(input: {
  buildingId: string;
  buildingDisplayName: string;
  managementCompanyObjectId: import("mongoose").Types.ObjectId;
  session?: ClientSession;
}): Promise<void> {
  const recipients = await listActiveLawyerAdminUserIds();
  const rows = mapForRecipients(
    recipients,
    {
      eventType: NotificationEventType.BUILDING_CREATED_BY_MC,
      titleHe: "בניין חדש נוסף",
      bodyHe: `«${input.buildingDisplayName}» נוסף על ידי חברת ניהול — נדרשת בדיקה ארגונית (לא אימות משפטי).`,
      entityType: NotificationEntityType.BUILDING,
      entityId: input.buildingId,
      buildingId: input.buildingId,
      destinationPath: lawyerBuildingPath(input.buildingId),
    },
    (recipientUserId) =>
      `building_created_by_mc:${input.buildingId}:${recipientUserId}`,
  );
  await insertNotificationsIdempotent({ notifications: rows, session: input.session });
}

export async function notifyMcBuildingRecorded(input: {
  buildingId: string;
  buildingDisplayName: string;
  managementCompanyObjectId: import("mongoose").Types.ObjectId;
  session?: ClientSession;
}): Promise<void> {
  const recipients = await listManagementCompanyRecipientUserIds({
    managementCompanyObjectId: input.managementCompanyObjectId,
  });
  const rows = mapForRecipients(
    recipients,
    {
      eventType: NotificationEventType.BUILDING_CREATED_BY_MC,
      titleHe: "בניין נוסף למערכת",
      bodyHe: `«${input.buildingDisplayName}» נרשם במערכת. אימות משפטי/ארגוני ממשיך במשרד.`,
      entityType: NotificationEntityType.BUILDING,
      entityId: input.buildingId,
      buildingId: input.buildingId,
      destinationPath: operatorBuildingPath(input.buildingId),
    },
    (recipientUserId) =>
      `building_created_mc_ack:${input.buildingId}:${recipientUserId}`,
  );
  await insertNotificationsIdempotent({ notifications: rows, session: input.session });
}
