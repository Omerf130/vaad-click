import { validateStatementOfClaimPlaceholderTokens } from "@/modules/statement-of-claim-templates/domain/statement-of-claim-placeholder-registry";

const MAX_SECTION_LENGTH = 20_000;

const UNSAFE_PATTERN = /<[^>]+>|javascript:|data:text\/html|on\w+\s*=/i;

export type SanitizeStatementOfClaimSectionResult =
  | { ok: true; text: string }
  | { ok: false; reason: "empty" | "too_long" | "unsafe_markup" | "unknown_placeholder" };

/** Plain-text section body/title — no HTML; registered {{placeholders}} allowed in body only. */
export function sanitizeStatementOfClaimSectionTitle(raw: string): SanitizeStatementOfClaimSectionResult {
  const normalized = raw.replace(/\r\n/g, "\n").trim();
  if (!normalized) {
    return { ok: false, reason: "empty" };
  }
  if (normalized.length > 200) {
    return { ok: false, reason: "too_long" };
  }
  if (UNSAFE_PATTERN.test(normalized)) {
    return { ok: false, reason: "unsafe_markup" };
  }
  if (normalized.includes("{{")) {
    return { ok: false, reason: "unknown_placeholder" };
  }
  return { ok: true, text: normalized };
}

export function sanitizeStatementOfClaimSectionBody(raw: string): SanitizeStatementOfClaimSectionResult {
  const normalized = raw.replace(/\r\n/g, "\n").trim();
  if (!normalized) {
    return { ok: false, reason: "empty" };
  }
  if (normalized.length > MAX_SECTION_LENGTH) {
    return { ok: false, reason: "too_long" };
  }
  if (UNSAFE_PATTERN.test(normalized)) {
    return { ok: false, reason: "unsafe_markup" };
  }
  const tokenCheck = validateStatementOfClaimPlaceholderTokens(normalized);
  if (!tokenCheck.ok) {
    return { ok: false, reason: "unknown_placeholder" };
  }
  return { ok: true, text: normalized };
}