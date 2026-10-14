import { ZodError } from "zod";

const FIELD_LABELS: Record<string, string> = {
  revision: "גרסת הטיוטה",
  debtorTreatmentFeeShekels: "דמי טיפול לחייב",
  committeeAssumedTreatmentFeeShekels: "דמי טיפול — ועד",
  trustAccountProcessingFeePercent: "עמלת נאמנות",
  committeeTransferFeePercent: "עמלת העברה לוועד",
  escalationPercent: "דמי הצלחה",
  notesInternal: "הערות פנימיות",
};

export function mapDraftFormZodErrorToFieldErrors(error: ZodError): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key !== "string") {
      continue;
    }
    const label = FIELD_LABELS[key] ?? key;
    const message =
      issue.code === "too_big"
        ? `${label}: ארוך מדי`
        : issue.code === "invalid_type" && issue.expected === "number"
          ? `${label}: ערך מספרי לא תקין`
          : `${label}: ${issue.message}`;
    fieldErrors[key] = fieldErrors[key] ? [...fieldErrors[key], message] : [message];
  }
  return fieldErrors;
}
