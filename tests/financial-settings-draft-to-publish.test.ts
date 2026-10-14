import { describe, expect, it } from "vitest";

import {
  FinancialSettingsError,
  FinancialSettingsErrorCode,
} from "@/modules/financial-settings/domain/financial-settings-errors";
import { buildPublishPayloadFromSavedDraft } from "@/modules/financial-settings/presentation/draft-to-publish-payload";

describe("buildPublishPayloadFromSavedDraft", () => {
  it("requires platform fee fields before publish", () => {
    const incompleteDraft = {
      revision: 1,
      currency: "ILS" as const,
      amountsMonetaryBasis: "gross_inclusive_vat" as const,
      amounts: {
        debtorTreatmentFeeGross: { currency: "ILS" as const, amountMinor: 11_800 },
        committeeTreatmentFeeWhenDebtorWaivedGross: { currency: "ILS" as const, amountMinor: 11_800 },
      },
      vatSchedule: [{ effectiveFrom: new Date("2030-01-01"), rateBasisPoints: 1800 }],
      escalation: { recoveryFeeRateBasisPoints: 2000 },
    };

    expect(() => buildPublishPayloadFromSavedDraft(incompleteDraft, "2030-06-01")).toThrow(
      FinancialSettingsError,
    );

    try {
      buildPublishPayloadFromSavedDraft(incompleteDraft, "2030-06-01");
    } catch (error) {
      expect(error).toMatchObject({ code: FinancialSettingsErrorCode.VALIDATION });
    }
  });
});
