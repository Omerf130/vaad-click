const CREDENTIAL_URI_PATTERN = /mongodb(\+srv)?:\/\/[^\s]+/gi;

/** Removes connection strings and common secret patterns from error text before logging. */
export function sanitizeMongoErrorMessage(message: string): string {
  return message.replace(CREDENTIAL_URI_PATTERN, "mongodb://[redacted]");
}

export function toSafeMongoConnectionError(cause: unknown): Error {
  if (cause instanceof Error) {
    return new Error(
      `Database connection failed: ${sanitizeMongoErrorMessage(cause.message)}`,
    );
  }
  return new Error("Database connection failed.");
}
