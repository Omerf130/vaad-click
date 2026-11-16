export const StatementOfClaimDraftStatus = {
  /** Current internal draft for the case (at most one). */
  ACTIVE: "active",
  /** Superseded by a newer revision; preserved for history. */
  SUPERSEDED: "superseded",
} as const;

export type StatementOfClaimDraftStatus =
  (typeof StatementOfClaimDraftStatus)[keyof typeof StatementOfClaimDraftStatus];