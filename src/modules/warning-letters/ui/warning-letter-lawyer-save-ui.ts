import { pickChangedClauseOverrides } from "@/modules/warning-letters/domain/pick-changed-clause-overrides";
import { isLawyerEditableClauseId } from "@/modules/warning-letters/domain/warning-letter-editable-clause";
import type { WarningLetterContentSnapshot } from "@/modules/warning-letters/snapshot/warning-letter-snapshot.types";

export type LawyerDraftSaveUiPhase = "idle" | "saving" | "awaitingPersistedDraft" | "failed";

export function computeLawyerDraftHasUnsavedChanges(input: {
  baselineSnapshot: WarningLetterContentSnapshot;
  clauseDrafts: Record<string, string>;
  isEditing: boolean;
}): boolean {
  if (!input.isEditing) {
    return false;
  }
  const changed = pickChangedClauseOverrides({
    snapshot: input.baselineSnapshot,
    overrides: Object.fromEntries(
      Object.entries(input.clauseDrafts).filter(([id]) => isLawyerEditableClauseId(id)),
    ) as never,
  });
  return Object.keys(changed).length > 0;
}

export function shouldShowLawyerDraftUnsavedIndicator(input: {
  isEditing: boolean;
  hasUnsavedChanges: boolean;
  saveUiPhase: LawyerDraftSaveUiPhase;
}): boolean {
  return (
    input.isEditing &&
    input.hasUnsavedChanges &&
    (input.saveUiPhase === "idle" || input.saveUiPhase === "failed")
  );
}

export function resolveSaveUiPhaseAfterServerResponse(input: {
  ok: boolean;
  unchanged?: boolean;
  savedDraftRevision?: number;
}): LawyerDraftSaveUiPhase {
  if (!input.ok) {
    return "failed";
  }
  if (input.unchanged) {
    return "idle";
  }
  if (input.savedDraftRevision != null) {
    return "awaitingPersistedDraft";
  }
  return "idle";
}

export function deriveLawyerDraftSaveUiPhase(input: {
  savePending: boolean;
  isEditing: boolean;
  draftRevision: number | undefined;
  awaitingPersistedRevision: number | null;
  saveState: { ok: boolean; message?: string };
  saveAttemptCompleted: boolean;
}): LawyerDraftSaveUiPhase {
  if (input.savePending) {
    return "saving";
  }
  if (
    input.awaitingPersistedRevision != null &&
    input.isEditing &&
    input.draftRevision !== input.awaitingPersistedRevision
  ) {
    return "awaitingPersistedDraft";
  }
  if (
    input.saveAttemptCompleted &&
    input.isEditing &&
    input.saveState.message &&
    !input.saveState.ok
  ) {
    return "failed";
  }
  return "idle";
}
