export const CommitteeEngagementErrorCode = {
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  VALIDATION: "VALIDATION",
  CONFLICT: "CONFLICT",
  AUDIT_PERSISTENCE: "AUDIT_PERSISTENCE",
  FINANCIAL_VERSION_INCOMPLETE: "FINANCIAL_VERSION_INCOMPLETE",
  ALREADY_SIGNED: "ALREADY_SIGNED",
} as const;

export type CommitteeEngagementErrorCode =
  (typeof CommitteeEngagementErrorCode)[keyof typeof CommitteeEngagementErrorCode];

export class CommitteeEngagementError extends Error {
  readonly code: CommitteeEngagementErrorCode;

  constructor(code: CommitteeEngagementErrorCode, message: string) {
    super(message);
    this.name = "CommitteeEngagementError";
    this.code = code;
  }
}
