import { pickChangedClauseOverrides } from "@/modules/warning-letters/domain/pick-changed-clause-overrides";
import { isLawyerEditableClauseId } from "@/modules/warning-letters/domain/warning-letter-editable-clause";
import type { WarningLetterContentSnapshot } from "@/modules/warning-letters/snapshot/warning-letter-snapshot.types";

/** Read latest plain text from inline contentEditable clause bodies in the letter DOM. */
export function collectClauseDraftsFromInlineEditors(
  container: HTMLElement | null,
): Record<string, string> {
  const out: Record<string, string> = {};
  if (!container) {
    return out;
  }
  const nodes = container.querySelectorAll<HTMLElement>("[data-clause-id].clauseEditableBody");
  for (const node of nodes) {
    const clauseId = node.getAttribute("data-clause-id");
    if (!clauseId) {
      continue;
    }
    out[clauseId] = (node.innerText ?? "").replace(/\r\n/g, "\n");
  }
  return out;
}

export function mergeClauseDraftMaps(
  baseline: Record<string, string>,
  flushed: Record<string, string>,
): Record<string, string> {
  return { ...baseline, ...flushed };
}

export type InlineSaveSubmissionPrep =
  | { kind: "noop" }
  | { kind: "submit"; merged: Record<string, string>; changed: Record<string, string> };

export function prepareInlineWarningLetterSaveSubmission(input: {
  snapshot: WarningLetterContentSnapshot;
  clauseDrafts: Record<string, string>;
  flushedFromDom: Record<string, string>;
}): InlineSaveSubmissionPrep {
  const merged = mergeClauseDraftMaps(input.clauseDrafts, input.flushedFromDom);
  const editableOverrides = Object.fromEntries(
    Object.entries(merged).filter(([id]) => isLawyerEditableClauseId(id)),
  );
  const changed = pickChangedClauseOverrides({
    snapshot: input.snapshot,
    overrides: editableOverrides as never,
  });
  if (Object.keys(changed).length === 0) {
    return { kind: "noop" };
  }
  return { kind: "submit", merged, changed };
}

/** Attach only changed clause bodies to the form immediately before native formAction submit. */
export function applyChangedClauseFieldsToForm(
  form: HTMLFormElement,
  changed: Record<string, string>,
): void {
  form.querySelectorAll('input[name^="clause__"]').forEach((node) => node.remove());
  for (const [clauseId, body] of Object.entries(changed)) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = `clause__${clauseId}`;
    input.value = body;
    form.appendChild(input);
  }
}

export function buildWarningLetterDraftSaveFormData(input: {
  debtCaseId: string;
  sourceDraftId: string;
  expectedConcurrencyRevision: number;
  snapshot: WarningLetterContentSnapshot;
  clauseDrafts: Record<string, string>;
}): FormData | null {
  const editableOverrides = Object.fromEntries(
    Object.entries(input.clauseDrafts).filter(([id]) => isLawyerEditableClauseId(id)),
  );
  const changed = pickChangedClauseOverrides({
    snapshot: input.snapshot,
    overrides: editableOverrides as never,
  });
  if (Object.keys(changed).length === 0) {
    return null;
  }
  return buildWarningLetterDraftSaveFormDataFromChanged(input, changed);
}

export function buildWarningLetterDraftSaveFormDataFromChanged(
  meta: {
    debtCaseId: string;
    sourceDraftId: string;
    expectedConcurrencyRevision: number;
  },
  changed: Record<string, string>,
): FormData {
  const formData = new FormData();
  formData.set("debtCaseId", meta.debtCaseId);
  formData.set("sourceDraftId", meta.sourceDraftId);
  formData.set("expectedConcurrencyRevision", String(meta.expectedConcurrencyRevision));
  for (const [clauseId, body] of Object.entries(changed)) {
    formData.set(`clause__${clauseId}`, body);
  }
  return formData;
}
