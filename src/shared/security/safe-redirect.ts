const MAX_RETURN_PATH_LENGTH = 512;

/** Allows same-site relative paths only — blocks open redirects. */
export function sanitizeReturnPath(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return null;
  }
  if (trimmed.includes("://") || trimmed.includes("\\")) {
    return null;
  }
  if (trimmed.length > MAX_RETURN_PATH_LENGTH) {
    return null;
  }

  return trimmed;
}
