/**
 * Optimistic concurrency for lawyer edits (CP8.4C.2).
 * Legacy drafts (CP8.4C.1) may omit `concurrencyRevision` in MongoDB; treat as 1.
 */

export function resolveWarningLetterDraftConcurrencyRevision(
  stored: number | null | undefined,
): number {
  if (typeof stored === "number" && Number.isFinite(stored) && stored >= 1) {
    return Math.floor(stored);
  }
  return 1;
}

export function warningLetterDraftConcurrencyMatchesExpected(input: {
  storedRaw: number | null | undefined;
  expected: number;
}): boolean {
  return (
    resolveWarningLetterDraftConcurrencyRevision(input.storedRaw) === input.expected
  );
}

/** Mongo filter fragment: active row matches the client's expected concurrency token. */
export function buildActiveDraftEditConcurrencyQuery(
  expectedConcurrencyRevision: number,
): Record<string, unknown> {
  if (expectedConcurrencyRevision === 1) {
    return {
      $or: [
        { concurrencyRevision: 1 },
        { concurrencyRevision: { $exists: false } },
        { concurrencyRevision: null },
      ],
    };
  }
  return { concurrencyRevision: expectedConcurrencyRevision };
}
