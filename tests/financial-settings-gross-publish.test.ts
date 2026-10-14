import { describe, expect, it } from "vitest";

import { AmountsMonetaryBasis } from "@/modules/financial-settings/domain/amounts-monetary-basis";
import {
  FinancialSettingsError,
  FinancialSettingsErrorCode,
} from "@/modules/financial-settings/domain/financial-settings-errors";
import { buildPublishPayloadFromSavedDraft } from "@/modules/financial-settings/presentation/draft-to-publish-payload";
import { derivePublishAmountsFromGrossDraft } from "@/modules/financial-settings/presentation/derive-publish-gross-amounts";
import { mapDraftDocumentToViewModel } from "@/modules/financial-settings/presentation/financial-settings-view-model";
import { CollectionAllocationOrder } from "@/modules/financial-settings/domain/collection-allocation-order";
import { CourtCostsPolicy } from "@/modules/financial-settings/domain/court-costs-policy";
import { EscalationCalculationBase } from "@/modules/financial-settings/domain/escalation-calculation-base";
import { CONFIRMED_SUCCESS_FEE_EXCLUSIONS } from "@/modules/financial-settings/domain/success-fee-exclusion";
import { startOfDayJerusalem } from "@/shared/time/jerusalem-calendar";

const platformFees = {
  trustAccountProcessingFeeBasisPoints: 230,
  committeeTransferFeeBasisPoints: 50,
};

const escalation = {
  recoveryFeeRateBasisPoints: 2000,
  calculationBase:
    EscalationCalculationBase.COLLECTED_PRINCIPAL_AND_INDEXATION_INTEREST_AFTER_LAWSUIT_FILED,
  courtCostsPolicy: CourtCostsPolicy.UNSPECIFIED,
  successFeeExclusions: [...CONFIRMED_SUCCESS_FEE_EXCLUSIONS],
  collectionAllocationOrder: CollectionAllocationOrder.EXPENSES_THEN_PRINCIPAL,
};

describe("gross-inclusive financial settings publish", () => {
  it("derives net and VAT at effective date from gross draft amounts", () => {
    const amounts = derivePublishAmountsFromGrossDraft({
      currency: "ILS",
      amountsMonetaryBasis: AmountsMonetaryBasis.GROSS_INCLUSIVE_VAT,
      amounts: {
        debtorTreatmentFeeGross: { currency: "ILS", amountMinor: 11_800 },
        committeeTreatmentFeeWhenDebtorWaivedGross: { currency: "ILS", amountMinor: 11_800 },
      },
      vatSchedule: [{ effectiveFrom: startOfDayJerusalem("2030-01-01"), rateBasisPoints: 1800 }],
      effectiveFromIso: "2030-06-01",
    });

    expect(amounts.debtorTreatmentFeeNet.amountMinor).toBe(10_000);
    expect(amounts.debtorTreatmentFeeVat.amountMinor).toBe(1_800);
    expect(amounts.appliedVatRateBasisPoints).toBe(1800);
  });

  it("blocks legacy net-only drafts from publishing", () => {
    expect(() =>
      buildPublishPayloadFromSavedDraft(
        {
          revision: 1,
          currency: "ILS",
          amounts: {
            debtorTreatmentFeeExVat: { currency: "ILS", amountMinor: 10_000 },
            committeeTreatmentFeeWhenDebtorWaivedExVat: { currency: "ILS", amountMinor: 20_000 },
          },
          vatSchedule: [{ effectiveFrom: startOfDayJerusalem("2030-01-01"), rateBasisPoints: 1800 }],
          escalation: { recoveryFeeRateBasisPoints: 2000 },
          platformFees,
        },
        "2030-06-01",
      ),
    ).toThrow(FinancialSettingsError);

    try {
      buildPublishPayloadFromSavedDraft(
        {
          revision: 1,
          currency: "ILS",
          amounts: {
            debtorTreatmentFeeExVat: { currency: "ILS", amountMinor: 10_000 },
            committeeTreatmentFeeWhenDebtorWaivedExVat: { currency: "ILS", amountMinor: 20_000 },
          },
          vatSchedule: [{ effectiveFrom: startOfDayJerusalem("2030-01-01"), rateBasisPoints: 1800 }],
          escalation: { recoveryFeeRateBasisPoints: 2000 },
          platformFees,
        },
        "2030-06-01",
      );
    } catch (error) {
      expect(error).toMatchObject({
        code: FinancialSettingsErrorCode.LEGACY_DRAFT_REQUIRES_GROSS_AMOUNTS,
      });
    }
  });

  it("marks cloned legacy drafts as requiring gross re-entry in the view model", () => {
    const view = mapDraftDocumentToViewModel({
      draft: {
        settingsVersionId: "draft-1",
        revision: 1,
        currency: "ILS",
        amounts: {
          debtorTreatmentFeeExVat: { currency: "ILS", amountMinor: 27_700 },
          committeeTreatmentFeeWhenDebtorWaivedExVat: { currency: "ILS", amountMinor: 15_000 },
        },
        provenance: { clonedFromSettingsVersionId: "published-legacy" },
      },
      publishedCount: 1,
    });

    expect(view.requiresGrossAmountReentry).toBe(true);
    expect(view.debtorTreatmentFeeShekels).toBe("");
    expect(view.legacyDebtorNetShekels).toBe("277.00");
  });

  it("builds publish payload from gross-inclusive saved draft", () => {
    const payload = buildPublishPayloadFromSavedDraft(
      {
        revision: 2,
        currency: "ILS",
        amountsMonetaryBasis: AmountsMonetaryBasis.GROSS_INCLUSIVE_VAT,
        amounts: {
          debtorTreatmentFeeGross: { currency: "ILS", amountMinor: 11_800 },
          committeeTreatmentFeeWhenDebtorWaivedGross: { currency: "ILS", amountMinor: 11_800 },
        },
        vatSchedule: [{ effectiveFrom: startOfDayJerusalem("2030-01-01"), rateBasisPoints: 1800 }],
        escalation,
        platformFees,
      },
      "2030-06-01",
    );

    expect(payload.amounts.debtorTreatmentFeeGross.amountMinor).toBe(11_800);
    expect(payload.amounts.debtorTreatmentFeeNet.amountMinor).toBe(10_000);
    expect(payload.amounts.debtorTreatmentFeeVat.amountMinor).toBe(1_800);
  });
});
