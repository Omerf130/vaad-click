export function resolveStatementOfClaimDraftConcurrencyRevision(
  stored: number | null | undefined,
): number {
  if (typeof stored === "number" && Number.isFinite(stored) && stored >= 1) {
    return Math.floor(stored);
  }
  return 1;
}

export function statementOfClaimDraftConcurrencyMatchesExpected(input: {
  storedRaw: number | null | undefined;
  expected: number;
}): boolean {
  return (
    resolveStatementOfClaimDraftConcurrencyRevision(input.storedRaw) === input.expected
  );
}

export function buildActiveStatementOfClaimDraftEditConcurrencyQuery(
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