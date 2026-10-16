import { computeWarningLetterContentSha256 } from "@/modules/warning-letters/snapshot/warning-letter-canonical-hash";
import type { WarningLetterContentSnapshot } from "@/modules/warning-letters/snapshot/warning-letter-snapshot.types";
import type { WarningLetterLawyerEditableClauseId } from "@/modules/warning-letters/domain/warning-letter-editable-clause";

export function applyManualClauseOverridesToSnapshot(input: {
  snapshot: WarningLetterContentSnapshot;
  overrides: Partial<Record<WarningLetterLawyerEditableClauseId, string>>;
}): WarningLetterContentSnapshot {
  const numberedClauses = input.snapshot.numberedClauses.map((clause) => {
    const override = input.overrides[clause.clauseId as WarningLetterLawyerEditableClauseId];
    if (override != null) {
      return { ...clause, body: override };
    }
    return clause;
  });

  const snapshotCreatedAtIso = new Date().toISOString();
  const withoutHash: Omit<WarningLetterContentSnapshot, "contentSha256"> = {
    ...input.snapshot,
    numberedClauses,
    snapshotCreatedAtIso,
  };

  const hashPayload = { ...withoutHash };
  delete (hashPayload as { snapshotCreatedAtIso?: string }).snapshotCreatedAtIso;
  const contentSha256 = computeWarningLetterContentSha256(hashPayload);

  return { ...withoutHash, contentSha256 };
}
