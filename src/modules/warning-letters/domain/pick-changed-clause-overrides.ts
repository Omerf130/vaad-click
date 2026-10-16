import type { WarningLetterLawyerEditableClauseId } from "@/modules/warning-letters/domain/warning-letter-editable-clause";
import type { WarningLetterContentSnapshot } from "@/modules/warning-letters/snapshot/warning-letter-snapshot.types";

export function pickChangedClauseOverrides(input: {
  snapshot: WarningLetterContentSnapshot;
  overrides: Partial<Record<WarningLetterLawyerEditableClauseId, string>>;
}): Partial<Record<WarningLetterLawyerEditableClauseId, string>> {
  const changed: Partial<Record<WarningLetterLawyerEditableClauseId, string>> = {};
  for (const [clauseId, text] of Object.entries(input.overrides) as Array<
    [WarningLetterLawyerEditableClauseId, string]
  >) {
    const existing = input.snapshot.numberedClauses.find((c) => c.clauseId === clauseId);
    if (!existing) {
      continue;
    }
    if (existing.body.trim() !== text.trim()) {
      changed[clauseId] = text;
    }
  }
  return changed;
}

export function buildInitialClauseDraftMap(
  snapshot: WarningLetterContentSnapshot,
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const clause of snapshot.numberedClauses) {
    map[clause.clauseId] = clause.body;
  }
  return map;
}
