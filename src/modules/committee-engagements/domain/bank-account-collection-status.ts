export const BankAccountCollectionStatus = {
  NOT_COLLECTED: "not_collected",
  PENDING_LAWYER_REVIEW: "pending_lawyer_review",
  APPROVED: "approved",
} as const;

export type BankAccountCollectionStatus =
  (typeof BankAccountCollectionStatus)[keyof typeof BankAccountCollectionStatus];
