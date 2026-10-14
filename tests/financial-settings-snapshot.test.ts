import { describe, expect, it } from "vitest";

import { AmountsMonetaryBasis } from "@/modules/financial-settings/domain/amounts-monetary-basis";
import { CourtCostsPolicy } from "@/modules/financial-settings/domain/court-costs-policy";
import { EscalationCalculationBase } from "@/modules/financial-settings/domain/escalation-calculation-base";
import { FINANCIAL_SETTINGS_SNAPSHOT_DISCLAIMER } from "@/modules/financial-settings/domain/financial-settings-snapshot";
import type { PublishedFinancialSettingsVersion } from "@/modules/financial-settings/domain/published-financial-settings-version";
import {
  materializeFinancialSettingsSnapshot,
  resolveVatScheduleEntryForInstant,
} from "@/modules/financial-settings/services/financial-settings-snapshot.service";
import { startOfDayJerusalem } from "@/shared/time/jerusalem-calendar";

const publishedVersion: PublishedFinancialSettingsVersion = {
  settingsVersionId: "settings-1",
  versionNumber: 1,
  effectiveFrom: startOfDayJerusalem("2026-11-01"),
  publishedAt: new Date("2026-10-01T00:00:00Z"),
  currency: "ILS",
  amounts: {
    amountsMonetaryBasis: AmountsMonetaryBasis.LEGACY_NET_EXCLUSIVE_VAT,
    debtorTreatmentFeeExVat: { currency: "ILS", amountMinor: 100 },
    committeeTreatmentFeeWhenDebtorWaivedExVat: { currency: "ILS", amountMinor: 200 },
  },
  vatSchedule: [
    { effectiveFrom: startOfDayJerusalem("2026-01-01"), rateBasisPoints: 1700 },
    { effectiveFrom: startOfDayJerusalem("2026-06-01"), rateBasisPoints: 1800 },
  ],
  escalation: {
    recoveryFeeRateBasisPoints: 2000,
    calculationBase: EscalationCalculationBase.UNSPECIFIED,
    courtCostsPolicy: CourtCostsPolicy.UNSPECIFIED,
  },
  platformFees: {
    trustAccountProcessingFeeBasisPoints: 230,
    committeeTransferFeeBasisPoints: 50,
  },
};

describe("financial settings snapshot materialization", () => {
  it("includes the non-legal VAT disclaimer", () => {
    const snapshot = materializeFinancialSettingsSnapshot(
      publishedVersion,
      startOfDayJerusalem("2026-07-01"),
    );
    expect(snapshot.disclaimer).toBe(FINANCIAL_SETTINGS_SNAPSHOT_DISCLAIMER);
  });

  it("resolves the latest VAT schedule entry not after asOf", () => {
    const entry = resolveVatScheduleEntryForInstant(
      publishedVersion.vatSchedule,
      startOfDayJerusalem("2026-07-01"),
    );
    expect(entry.rateBasisPoints).toBe(1800);
  });

  it("rejects materialization when platform fees are missing", () => {
    const legacy = { ...publishedVersion, platformFees: undefined };
    expect(() =>
      materializeFinancialSettingsSnapshot(legacy, startOfDayJerusalem("2026-07-01")),
    ).toThrow();
  });

  it("does not perform billing calculations", () => {
    const snapshot = materializeFinancialSettingsSnapshot(
      publishedVersion,
      startOfDayJerusalem("2026-07-01"),
    );
    expect(Object.keys(snapshot)).not.toContain("totalDueMinor");
    expect(snapshot.amountsMonetaryBasis).toBe(AmountsMonetaryBasis.LEGACY_NET_EXCLUSIVE_VAT);
  });
});
