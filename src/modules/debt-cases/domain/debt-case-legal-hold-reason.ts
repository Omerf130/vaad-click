/** Reasons legal treatment (letters, collection) must not proceed. */
export const DebtCaseLegalHoldReason = {
  BUILDING_NOT_APPROVED: "building_not_approved",
  ENGAGEMENT_NOT_SIGNED: "engagement_not_signed",
  POA_NOT_SIGNED: "poa_not_signed",
  DEBTOR_DISPUTE: "debtor_dispute",
  DEBTOR_INSOLVENCY: "debtor_insolvency",
  DEBTOR_DECEASED: "debtor_deceased",
  BANK_ACCOUNT_CHANGE_UNAPPROVED: "bank_account_change_unapproved",
} as const;

export type DebtCaseLegalHoldReason =
  (typeof DebtCaseLegalHoldReason)[keyof typeof DebtCaseLegalHoldReason];
