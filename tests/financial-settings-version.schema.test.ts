import { describe, expect, it } from "vitest";

import { publishFinancialSettingsInputSchema } from "@/modules/financial-settings/validation/financial-settings-content.schema";
import { CourtCostsPolicy } from "@/modules/financial-settings/domain/court-costs-policy";
import { EscalationCalculationBase } from "@/modules/financial-settings/domain/escalation-calculation-base";

const basePublishPayload = {
  revision: 1,
  effectiveFromIso: "2030-01-01",
  currency: "ILS" as const,
  amounts: {
    debtorTreatmentFeeExVat: { currency: "ILS" as const, amountMinor: 100 },
    committeeTreatmentFeeWhenDebtorWaivedExVat: { currency: "ILS" as const, amountMinor: 200 },
  },
  vatSchedule: [{ effectiveFromIso: "2030-01-01", rateBasisPoints: 1800 }],
  escalation: {
    recoveryFeeRateBasisPoints: 2000,
    calculationBase: EscalationCalculationBase.UNSPECIFIED,
    courtCostsPolicy: CourtCostsPolicy.UNSPECIFIED,
  },
};

describe("publish financial settings schema", () => {
  it("requires at least one VAT schedule entry", () => {
    expect(() =>
      publishFinancialSettingsInputSchema.parse({
        ...basePublishPayload,
        vatSchedule: [],
      }),
    ).toThrow();
  });

  it("rejects non-increasing VAT schedule dates", () => {
    expect(() =>
      publishFinancialSettingsInputSchema.parse({
        ...basePublishPayload,
        vatSchedule: [
          { effectiveFromIso: "2030-02-01", rateBasisPoints: 1800 },
          { effectiveFromIso: "2030-01-01", rateBasisPoints: 1700 },
        ],
      }),
    ).toThrow();
  });

  it("accepts explicit fee and VAT values without defaults", () => {
    const parsed = publishFinancialSettingsInputSchema.parse(basePublishPayload);
    expect(parsed.amounts.debtorTreatmentFeeExVat.amountMinor).toBe(100);
    expect(parsed.vatSchedule[0]?.rateBasisPoints).toBe(1800);
  });
});
