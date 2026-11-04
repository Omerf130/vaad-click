export const ClientApprovalStatus = {
  AWAITING_SUBMISSION: "awaiting_submission",
  PENDING_LAWYER_APPROVAL: "pending_lawyer_approval",
  APPROVED: "approved",
  REJECTED: "rejected",
} as const;

export type ClientApprovalStatus =
  (typeof ClientApprovalStatus)[keyof typeof ClientApprovalStatus];

export const CLIENT_APPROVAL_STATUSES: readonly ClientApprovalStatus[] =
  Object.values(ClientApprovalStatus);

export function isClientApprovalStatus(value: string): value is ClientApprovalStatus {
  return (CLIENT_APPROVAL_STATUSES as readonly string[]).includes(value);
}
