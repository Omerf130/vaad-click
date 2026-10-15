export const DebtCaseLawyerReviewStatus = {
  NOT_SUBMITTED: "not_submitted",
  PENDING: "pending",
  APPROVED_FOR_LETTER_PREP: "approved_for_letter_prep",
  REJECTED: "rejected",
  RETURNED: "returned",
} as const;

export type DebtCaseLawyerReviewStatus =
  (typeof DebtCaseLawyerReviewStatus)[keyof typeof DebtCaseLawyerReviewStatus];

export const CP8_DEBT_CASE_LAWYER_REVIEW_STATUSES: readonly DebtCaseLawyerReviewStatus[] =
  Object.values(DebtCaseLawyerReviewStatus);
