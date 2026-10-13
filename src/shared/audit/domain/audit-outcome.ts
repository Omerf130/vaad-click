export const AuditOutcome = {
  SUCCESS: "success",
  FAILURE: "failure",
  DENIED: "denied",
} as const;

export type AuditOutcome = (typeof AuditOutcome)[keyof typeof AuditOutcome];

export const AUDIT_OUTCOMES: readonly AuditOutcome[] = Object.values(AuditOutcome);
