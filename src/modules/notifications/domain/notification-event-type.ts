export const NotificationEventType = {
  ACCOUNT_REGISTRATION_PENDING: "account_registration_pending",
  ACCOUNT_APPROVED: "account_approved",
  ACCOUNT_REJECTED: "account_rejected",
  DEBT_CASE_SUBMITTED: "debt_case_submitted",
  DEBT_CASE_RESUBMITTED: "debt_case_resubmitted",
  DEBT_CASE_APPROVED: "debt_case_approved",
  DEBT_CASE_RETURNED: "debt_case_returned",
  DEBT_CASE_REJECTED: "debt_case_rejected",
  BUILDING_CREATED_BY_MC: "building_created_by_mc",
} as const;

export type NotificationEventType =
  (typeof NotificationEventType)[keyof typeof NotificationEventType];

export const NotificationEntityType = {
  DEBT_CASE: "debt_case",
  BUILDING: "building",
  USER: "user",
  ADMIN_QUEUE: "admin_queue",
} as const;

export type NotificationEntityType =
  (typeof NotificationEntityType)[keyof typeof NotificationEntityType];
