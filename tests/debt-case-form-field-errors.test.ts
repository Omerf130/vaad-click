import { describe, expect, it } from "vitest";
import { z } from "zod";

import { DebtCaseDebtType } from "@/modules/debt-cases/domain/debt-case-debt-type";
import { DebtCaseOccupancyType } from "@/modules/debt-cases/domain/debt-case-occupancy-type";
import { LegalDebtorDesignation } from "@/modules/debt-cases/domain/debt-case-parties";
import {
  firstInvalidElementId,
  validationSummaryMessage,
  zodErrorToFieldErrors,
} from "@/modules/debt-cases/presentation/debt-case-form-field-errors";
import { debtCaseSubmitInputSchema } from "@/modules/debt-cases/validation/debt-case.schema";

describe("debt-case-form-field-errors", () => {
  it("maps principalAmountMinor Zod path to principalAmountNis form field", () => {
    const parsed = debtCaseSubmitInputSchema.safeParse({
      buildingId: "11111111-1111-4111-8111-111111111111",
      apartmentNumber: "12",
      propertyOwners: [{ fullName: "ישראל", mobile: "0501234567" }],
      occupancyType: DebtCaseOccupancyType.OWNER,
      legalDebtorDesignation: LegalDebtorDesignation.PROPERTY_OWNERS,
      debtType: DebtCaseDebtType.REGULAR_VAAD,
      principalAmountMinor: 0,
      periodStartMonth: "2024-01",
      periodEndMonth: "2024-06",
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const fieldErrors = zodErrorToFieldErrors(parsed.error);
      expect(fieldErrors.principalAmountNis).toBe("סכום החוב חייב להיות חיובי");
      expect(fieldErrors.principalAmountMinor).toBeUndefined();
    }
  });

  it("uses specific summary for a single field error", () => {
    const message = validationSummaryMessage({ apartmentNumber: "נדרש מספר דירה" });
    expect(message).toBe("נדרש מספר דירה");
  });

  it("uses multi-field summary when several fields fail", () => {
    const message = validationSummaryMessage({
      apartmentNumber: "נדרש מספר דירה",
      "propertyOwners.0.mobile": "מספר נייד לא תקין",
    });
    expect(message).toBe("יש לתקן 2 שדות — הפרטים מסומנים ליד כל שדה.");
  });

  it("falls back to generic summary only when no field keys exist", () => {
    expect(validationSummaryMessage({})).toBe("יש לתקן את השדות המסומנים.");
  });

  it("resolves nested owner mobile path to focus target", () => {
    expect(
      firstInvalidElementId({
        "propertyOwners.0.mobile": "מספר נייד לא תקין",
      }),
    ).toBe("owner0-mobile");
  });

  it("maps arbitrary Zod errors by joined path", () => {
    const schema = z.object({ nested: z.object({ value: z.string().min(1, "חובה") }) });
    const result = schema.safeParse({ nested: { value: "" } });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(zodErrorToFieldErrors(result.error)).toEqual({ "nested.value": "חובה" });
    }
  });
});
