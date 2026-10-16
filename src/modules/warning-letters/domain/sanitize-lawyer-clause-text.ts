const MAX_CLAUSE_LENGTH = 4_000;

const UNSAFE_PATTERN = /<[^>]+>|javascript:|data:text\/html|on\w+\s*=/i;

export type SanitizeClauseResult =
  | { ok: true; text: string }
  | { ok: false; reason: "empty" | "too_long" | "unsafe_markup" | "placeholder_not_allowed" };

/** Plain-text lawyer clause override — no HTML, no template placeholders. */
export function sanitizeLawyerClauseOverrideText(raw: string): SanitizeClauseResult {
  const normalized = raw.replace(/\r\n/g, "\n").trim();
  if (!normalized) {
    return { ok: false, reason: "empty" };
  }
  if (normalized.length > MAX_CLAUSE_LENGTH) {
    return { ok: false, reason: "too_long" };
  }
  if (UNSAFE_PATTERN.test(normalized)) {
    return { ok: false, reason: "unsafe_markup" };
  }
  if (/\{[a-zA-Z_]+\}/.test(normalized)) {
    return { ok: false, reason: "placeholder_not_allowed" };
  }
  return { ok: true, text: normalized };
}
