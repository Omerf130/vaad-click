import { describe, expect, it } from "vitest";

import { CollectionAllocationOrder } from "@/modules/financial-settings/domain/collection-allocation-order";
import { publishFinancialSettingsInputSchema } from "@/modules/financial-settings/validation/financial-settings-content.schema";
import { CourtCostsPolicy } from "@/modules/financial-settings/domain/court-costs-policy";
import { EscalationCalculationBase } from "@/modules/financial-settings/domain/escalation-calculation-base";
import { CONFIRMED_SUCCESS_FEE_EXCLUSIONS } from "@/modules/financial-settings/domain/success-fee-exclusion";
import { SAMPLE_GROSS_PUBLISH_AMOUNTS } from "./fixtures/gross-financial-settings-amounts";

const basePublishPayload = {
  revision: 1,
  effectiveFromIso: "2030-01-01",
  currency: "ILS" as const,
  amounts: SAMPLE_GROSS_PUBLISH_AMOUNTS,
  vatSchedule: [{ effectiveFromIso: "2030-01-01", rateBasisPoints: 1800 }],
  escalation: {
    recoveryFeeRateBasisPoints: 2000,
    calculationBase:
      EscalationCalculationBase.COLLECTED_PRINCIPAL_AND_INDEXATION_INTEREST_AFTER_LAWSUIT_FILED,
    courtCostsPolicy: CourtCostsPolicy.UNSPECIFIED,
    successFeeExclusions: [...CONFIRMED_SUCCESS_FEE_EXCLUSIONS],
    collectionAllocationOrder: CollectionAllocationOrder.EXPENSES_THEN_PRINCIPAL,
  },
  platformFees: {
    trustAccountProcessingFeeBasisPoints: 230,
    committeeTransferFeeBasisPoints: 50,
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
    expect(parsed.amounts.debtorTreatmentFeeGross.amountMinor).toBe(11_800);
    expect(parsed.amounts.debtorTreatmentFeeNet.amountMinor).toBe(10_000);
    expect(parsed.vatSchedule[0]?.rateBasisPoints).toBe(1800);
  });
});
