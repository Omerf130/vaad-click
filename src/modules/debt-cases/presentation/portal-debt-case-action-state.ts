import type { DebtCaseValidationFlag } from "@/modules/debt-cases/domain/debt-case-validation-flag";

export type DebtCaseFormIntent = "save" | "preview" | "submit";

/** Plain action state safe for React Server Actions / useActionState round-trips. */
export type SerializablePortalDebtCaseActionState = {
  ok: boolean;
  message?: string;
  code?: string;
  fieldErrors?: Record<string, string>;
  flags?: DebtCaseValidationFlag[];
  revision?: number;
  debtCaseId?: string;
  lastIntent?: DebtCaseFormIntent;
};

export function normalizeDebtCaseValidationFlags(
  flags: readonly DebtCaseValidationFlag[] | undefined,
): DebtCaseValidationFlag[] | undefined {
  if (!flags || flags.length === 0) {
    return flags?.length === 0 ? [] : undefined;
  }
  return flags.map((flag) => ({
    code: flag.code,
    severity: flag.severity,
    messageHe: flag.messageHe,
  }));
}

/** Strip non-JSON-safe values so useActionState prev state can cross the server boundary. */
export function sanitizePortalDebtCaseActionState(
  state: SerializablePortalDebtCaseActionState,
): SerializablePortalDebtCaseActionState {
  const out: SerializablePortalDebtCaseActionState = { ok: Boolean(state.ok) };
  if (state.message !== undefined) {
    out.message = String(state.message);
  }
  if (state.code !== undefined) {
    out.code = String(state.code);
  }
  if (state.fieldErrors && Object.keys(state.fieldErrors).length > 0) {
    out.fieldErrors = Object.fromEntries(
      Object.entries(state.fieldErrors).map(([key, value]) => [key, String(value)]),
    );
  }
  const flags = normalizeDebtCaseValidationFlags(state.flags);
  if (flags && flags.length > 0) {
    out.flags = flags;
  } else if (flags?.length === 0) {
    out.flags = [];
  }
  if (state.revision !== undefined && Number.isFinite(state.revision)) {
    out.revision = Number(state.revision);
  }
  if (state.debtCaseId !== undefined) {
    out.debtCaseId = String(state.debtCaseId);
  }
  if (state.lastIntent !== undefined) {
    out.lastIntent = state.lastIntent;
  }
  return out;
}

/** Regression guard: action state must round-trip through JSON without stack overflow. */
export function assertActionStateJsonSerializable(state: SerializablePortalDebtCaseActionState): void {
  JSON.parse(JSON.stringify(sanitizePortalDebtCaseActionState(state)));
}
