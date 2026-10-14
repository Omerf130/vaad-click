export const OrganizationErrorCode = {
  FORBIDDEN: "FORBIDDEN",
  VALIDATION: "VALIDATION",
  NOT_FOUND: "NOT_FOUND",
  DUPLICATE_ADDRESS: "DUPLICATE_ADDRESS",
  REP_ALREADY_ASSIGNED: "REP_ALREADY_ASSIGNED",
  BUILDING_ALREADY_HAS_REP: "BUILDING_ALREADY_HAS_REP",
  INVALID_ACCOUNT_STATUS: "INVALID_ACCOUNT_STATUS",
  INVALID_ROLE: "INVALID_ROLE",
  VERIFICATION_NOT_AVAILABLE: "VERIFICATION_NOT_AVAILABLE",
  AUDIT_PERSISTENCE: "AUDIT_PERSISTENCE",
  CONFLICT: "CONFLICT",
  MANAGEMENT_COMPANY_INACTIVE: "MANAGEMENT_COMPANY_INACTIVE",
} as const;

export type OrganizationErrorCode =
  (typeof OrganizationErrorCode)[keyof typeof OrganizationErrorCode];

export class OrganizationError extends Error {
  readonly code: OrganizationErrorCode;

  constructor(code: OrganizationErrorCode, message: string) {
    super(message);
    this.name = "OrganizationError";
    this.code = code;
  }
}
