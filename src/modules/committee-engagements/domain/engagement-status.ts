export const CommitteeEngagementStatus = {
  /** Proposed terms captured by lawyer — not legally signed (CP6D). */
  PROPOSED_TERMS: "proposed_terms",
  /** Reserved for digital signature workflow. */
  PENDING_SIGNATURE: "pending_signature",
  /** Reserved — signed terms immutable after activation. */
  ACTIVE_SIGNED: "active_signed",
  /** Reserved — bank detail change or lawyer hold. */
  TRANSFERS_SUSPENDED: "transfers_suspended",
  /** Reserved — superseded by a new engagement. */
  SUPERSEDED: "superseded",
} as const;

export type CommitteeEngagementStatus =
  (typeof CommitteeEngagementStatus)[keyof typeof CommitteeEngagementStatus];
