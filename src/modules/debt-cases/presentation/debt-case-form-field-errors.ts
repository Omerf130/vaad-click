import type { ZodError } from "zod";

/** Map Zod paths to form control `name` attributes where they differ. */
const ZOD_PATH_TO_FORM_FIELD: Record<string, string> = {
  principalAmountMinor: "principalAmountNis",
};

export function zodErrorToFieldErrors(error: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const rawKey = issue.path.join(".") || "form";
    const key = ZOD_PATH_TO_FORM_FIELD[rawKey] ?? rawKey;
    if (!out[key]) {
      out[key] = issue.message;
    }
  }
  return out;
}

export function validationSummaryMessage(fieldErrors: Record<string, string>): string {
  const keys = Object.keys(fieldErrors);
  if (keys.length === 0) {
    return "יש לתקן את השדות המסומנים.";
  }
  if (keys.length === 1) {
    return fieldErrors[keys[0] ?? "form"] ?? "יש לתקן את השדות המסומנים.";
  }
  return `יש לתקן ${keys.length} שדות — הפרטים מסומנים ליד כל שדה.`;
}

export function fieldHasError(fieldErrors: Record<string, string> | undefined, name: string): boolean {
  if (!fieldErrors) {
    return false;
  }
  return Boolean(fieldErrors[name]);
}

/** Maps Zod/form field name to element id for focus management. */
export function formFieldNameToElementId(name: string): string | null {
  const ownerName = /^propertyOwners\.(\d+)\.fullName$/.exec(name);
  if (ownerName) {
    return `owner${ownerName[1]}-name`;
  }
  const ownerMobile = /^propertyOwners\.(\d+)\.mobile$/.exec(name);
  if (ownerMobile) {
    return `owner${ownerMobile[1]}-mobile`;
  }
  const ownerIdNum = /^propertyOwners\.(\d+)\.identityNumber$/.exec(name);
  if (ownerIdNum) {
    return `owner${ownerIdNum[1]}-id-number`;
  }
  const ownerIdType = /^propertyOwners\.(\d+)\.identityDocumentType$/.exec(name);
  if (ownerIdType) {
    return `owner${ownerIdType[1]}-id-type`;
  }
  if (name === "tenant.fullName") {
    return "tenant-fullName";
  }
  if (name === "tenant.mobile") {
    return "tenant-mobile";
  }
  if (name === "tenant.identityNumber") {
    return "tenant-id-number";
  }
  if (name === "principalAmountNis" || name === "principalAmountMinor") {
    return "principalAmountNis";
  }
  if (name === "propertyOwners") {
    return "owner0-mobile";
  }
  if (name === "tenant") {
    return "tenant-fullName";
  }
  if (name === "form") {
    return null;
  }
  return name;
}

export function formLevelFieldErrors(fieldErrors: Record<string, string>): Array<[string, string]> {
  return Object.entries(fieldErrors).filter(([key]) => formFieldNameToElementId(key) === null);
}

export function firstInvalidElementId(fieldErrors: Record<string, string>): string | null {
  for (const key of Object.keys(fieldErrors)) {
    const id = formFieldNameToElementId(key);
    if (id) {
      return id;
    }
  }
  return null;
}
