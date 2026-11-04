export const DebtCaseIntakeDraftStatus = {
  DRAFT: "draft",
  SUBMITTED_PENDING_BUILDING: "submitted_pending_building",
  COMPLETED: "completed",
} as const;

export type DebtCaseIntakeDraftStatus =
  (typeof DebtCaseIntakeDraftStatus)[keyof typeof DebtCaseIntakeDraftStatus];

export const BuildingAssociationReviewStatus = {
  OPEN: "open",
  RESOLVED: "resolved",
  CANCELLED: "cancelled",
} as const;

export type BuildingAssociationReviewStatus =
  (typeof BuildingAssociationReviewStatus)[keyof typeof BuildingAssociationReviewStatus];
