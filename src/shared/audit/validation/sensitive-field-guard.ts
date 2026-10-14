/** Short tokens like `pan` use word boundaries to avoid false positives (e.g. `managementCompanyId`). */
const FORBIDDEN_KEY_PATTERN =
  /password|passwd|secret|token|cookie|session|otp|mfa|totp|hash|authorization|credential|api[_-]?key|connection[_-]?string|mongodb(\+srv)?|card|cvv|\bpan\b/i;

const FORBIDDEN_VALUE_PATTERN = /mongodb(\+srv)?:\/\/|Bearer\s+[A-Za-z0-9\-._~+/]+=*/i;

export class AuditSensitiveDataError extends Error {
  readonly code = "AUDIT_SENSITIVE_DATA";

  constructor(message = "Audit metadata contains sensitive data.") {
    super(message);
    this.name = "AuditSensitiveDataError";
  }
}

export function assertAuditMetadataKeyAllowed(key: string): void {
  if (FORBIDDEN_KEY_PATTERN.test(key)) {
    throw new AuditSensitiveDataError(`Disallowed metadata key: ${key}`);
  }
}

export function assertAuditMetadataStringValueSafe(value: string): void {
  if (FORBIDDEN_VALUE_PATTERN.test(value)) {
    throw new AuditSensitiveDataError("Disallowed metadata value pattern.");
  }
  if (value.length > 500) {
    throw new AuditSensitiveDataError("Metadata string value too long.");
  }
}
