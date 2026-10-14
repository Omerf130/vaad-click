import { describe, expect, it } from "vitest";

import {
  draftFinancialSettingsContentSchema,
} from "@/modules/financial-settings/validation/financial-settings-content.schema";
import { mapDraftFormToContentInput } from "@/modules/financial-settings/validation/financial-settings-form.schema";

describe("draft save content schema", () => {
  it("accepts mapped gross-inclusive draft content from typical form values", () => {
    const mapped = mapDraftFormToContentInput({
      fields: {
        revision: 1,
        debtorTreatmentFeeShekels: "327.06",
        committeeAssumedTreatmentFeeShekels: "150.00",
        trustAccountProcessingFeePercent: "2.3",
        committeeTransferFeePercent: "0.5",
        escalationPercent: "20",
      },
      vatRows: [{ effectiveFromIso: "2026-10-14", ratePercent: "18" }],
    });
    expect(mapped.ok).toBe(true);
    if (!mapped.ok) {
      throw new Error(JSON.stringify(mapped.fieldErrors));
    }
    expect(() => draftFinancialSettingsContentSchema.parse(mapped.content)).not.toThrow();
  });

  it("accepts display-formatted percentage strings from the view model", () => {
    const mapped = mapDraftFormToContentInput({
      fields: {
        revision: 1,
        debtorTreatmentFeeShekels: "400",
        committeeAssumedTreatmentFeeShekels: "200",
        trustAccountProcessingFeePercent: "2.30",
        committeeTransferFeePercent: "0.50",
        escalationPercent: "20",
      },
      vatRows: [{ effectiveFromIso: "2026-10-14", ratePercent: "18.00" }],
    });
    expect(mapped.ok).toBe(true);
    if (!mapped.ok) {
      throw new Error(JSON.stringify(mapped.fieldErrors));
    }
    const parsed = draftFinancialSettingsContentSchema.parse(mapped.content);
    expect(parsed.platformFees?.trustAccountProcessingFeeBasisPoints).toBe(230);
    expect(parsed.platformFees?.committeeTransferFeeBasisPoints).toBe(50);
    expect(parsed.escalation?.recoveryFeeRateBasisPoints).toBe(2000);
  });

  it("reports missing debtor gross amount with a field-specific message", () => {
    const mapped = mapDraftFormToContentInput({
      fields: {
        revision: 1,
        debtorTreatmentFeeShekels: "",
        committeeAssumedTreatmentFeeShekels: "150",
        trustAccountProcessingFeePercent: "2.3",
        committeeTransferFeePercent: "0.5",
        escalationPercent: "20",
      },
      vatRows: [{ effectiveFromIso: "2026-10-14", ratePercent: "18" }],
    });
    expect(mapped.ok).toBe(false);
    if (mapped.ok) {
      return;
    }
    expect(mapped.fieldErrors.debtorTreatmentFeeShekels?.[0]).toMatch(/סכום/);
  });
});
