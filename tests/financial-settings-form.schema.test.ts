import { describe, expect, it } from "vitest";

import { mapDraftFormToContentInput } from "@/modules/financial-settings/validation/financial-settings-form.schema";

describe("financial settings draft form mapping", () => {
  it("maps valid shekel and percent fields to CP5A content", () => {
    const mapped = mapDraftFormToContentInput({
      fields: {
        revision: 1,
        debtorTreatmentFeeShekels: "277",
        committeeAssumedTreatmentFeeShekels: "150",
        trustAccountProcessingFeePercent: "2.3",
        committeeTransferFeePercent: "0.5",
        escalationPercent: "20",
      },
      vatRows: [{ effectiveFromIso: "2030-01-01", ratePercent: "18" }],
    });

    expect(mapped.ok).toBe(true);
    if (mapped.ok && mapped.content.amounts?.debtorTreatmentFeeGross) {
      expect(mapped.content.amounts.debtorTreatmentFeeGross.amountMinor).toBe(27700);
      expect(mapped.content.amountsMonetaryBasis).toBe("gross_inclusive_vat");
      expect(mapped.content.escalation?.recoveryFeeRateBasisPoints).toBe(2000);
      expect(mapped.content.platformFees?.trustAccountProcessingFeeBasisPoints).toBe(230);
      expect(mapped.content.platformFees?.committeeTransferFeeBasisPoints).toBe(50);
      expect(mapped.content.vatSchedule?.[0]?.rateBasisPoints).toBe(1800);
    }
  });
});
