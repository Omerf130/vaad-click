import { isLawyerEditableClauseId } from "@/modules/warning-letters/domain/warning-letter-editable-clause";

export function parseClauseOverridesFromFormData(
  formData: FormData,
): Record<string, string> {
  const clauseOverrides: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("clause__")) {
      continue;
    }
    const clauseId = key.slice("clause__".length);
    if (isLawyerEditableClauseId(clauseId)) {
      clauseOverrides[clauseId] = String(value);
    }
  }
  return clauseOverrides;
}
