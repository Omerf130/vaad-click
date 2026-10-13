export class AuditWriteFailedError extends Error {
  readonly code = "AUDIT_WRITE_FAILED";

  constructor(message = "Failed to persist audit event.") {
    super(message);
    this.name = "AuditWriteFailedError";
  }
}

export class AuditEventImmutableError extends Error {
  readonly code = "AUDIT_EVENT_IMMUTABLE";

  constructor(operation: string) {
    super(`Audit events are append-only; operation not allowed: ${operation}`);
    this.name = "AuditEventImmutableError";
  }
}
