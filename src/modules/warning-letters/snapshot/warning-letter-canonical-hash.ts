import { createHash } from "node:crypto";

/** Deterministic SHA-256 over canonical JSON (sorted keys). */
export function computeWarningLetterContentSha256(payload: unknown): string {
  const canonical = stableStringify(payload);
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortDeep(value));
}

function sortDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => sortDeep(entry));
  }
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const sortedKeys = Object.keys(record).sort();
    const out: Record<string, unknown> = {};
    for (const key of sortedKeys) {
      out[key] = sortDeep(record[key]);
    }
    return out;
  }
  return value;
}
