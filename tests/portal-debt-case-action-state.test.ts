import { describe, expect, it } from "vitest";

import {
  DebtCaseValidationFlagCode,
  DebtCaseValidationFlagSeverity,
} from "@/modules/debt-cases/domain/debt-case-validation-flag";
import {
  assertActionStateJsonSerializable,
  normalizeDebtCaseValidationFlags,
  sanitizePortalDebtCaseActionState,
} from "@/modules/debt-cases/presentation/portal-debt-case-action-state";

describe("portal debt case action state serialization", () => {
  it("normalizes flags to plain code/severity/messageHe objects", () => {
    const flags = normalizeDebtCaseValidationFlags([
      {
        code: DebtCaseValidationFlagCode.LEGAL_READINESS_INCOMPLETE,
        severity: DebtCaseValidationFlagSeverity.WARN,
        messageHe: "אזהרה",
      },
    ]);
    expect(flags).toEqual([
      {
        code: DebtCaseValidationFlagCode.LEGAL_READINESS_INCOMPLETE,
        severity: DebtCaseValidationFlagSeverity.WARN,
        messageHe: "אזהרה",
      },
    ]);
  });

  it("drops non-enumerable extras that break Server Action round-trips", () => {
    const circular: Record<string, unknown> = {
      code: DebtCaseValidationFlagCode.REPEAT_DEBTOR,
      severity: DebtCaseValidationFlagSeverity.WARN,
      messageHe: "חוזר",
    };
    circular.self = circular;

    const sanitized = sanitizePortalDebtCaseActionState({
      ok: true,
      lastIntent: "preview",
      message: "ניתן להגיש — שימו לב לאזהרות.",
      flags: normalizeDebtCaseValidationFlags([
        circular as unknown as {
          code: typeof DebtCaseValidationFlagCode.REPEAT_DEBTOR;
          severity: typeof DebtCaseValidationFlagSeverity.WARN;
          messageHe: string;
        },
      ]),
    });

    expect(() => assertActionStateJsonSerializable(sanitized)).not.toThrow();
    expect(JSON.parse(JSON.stringify(sanitized)).flags[0]).toEqual({
      code: DebtCaseValidationFlagCode.REPEAT_DEBTOR,
      severity: DebtCaseValidationFlagSeverity.WARN,
      messageHe: "חוזר",
    });
  });

  it("sanitizes field errors for a failed submit after preview state", () => {
    const state = sanitizePortalDebtCaseActionState({
      ok: false,
      lastIntent: "submit",
      message: "מסמך זיהוי לא תקין",
      fieldErrors: { "propertyOwners.0.identityNumber": "מסמך זיהוי לא תקין" },
      flags: [
        {
          code: DebtCaseValidationFlagCode.LEGAL_READINESS_INCOMPLETE,
          severity: DebtCaseValidationFlagSeverity.WARN,
          messageHe: "הבניין טרם מוכן",
        },
      ],
    });
    expect(() => assertActionStateJsonSerializable(state)).not.toThrow();
  });
});
