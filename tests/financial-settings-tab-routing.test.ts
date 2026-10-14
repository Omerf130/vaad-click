import { describe, expect, it } from "vitest";

import {
  FINANCIAL_SETTINGS_TAB_IDS,
  FINANCIAL_SETTINGS_TAB_LABELS,
  resolveFinancialSettingsTabForFieldErrors,
  tabHasValidationErrors,
} from "@/modules/financial-settings/presentation/financial-settings-tab-routing";

describe("financial settings tab configuration", () => {
  it("defines the four approved desktop tabs in order", () => {
    expect(FINANCIAL_SETTINGS_TAB_IDS).toEqual(["fees", "vat", "publish", "history"]);
    expect(FINANCIAL_SETTINGS_TAB_LABELS.fees).toBe("תעריפים");
    expect(FINANCIAL_SETTINGS_TAB_LABELS.vat).toBe('מע"מ');
    expect(FINANCIAL_SETTINGS_TAB_LABELS.publish).toBe("פרסום");
    expect(FINANCIAL_SETTINGS_TAB_LABELS.history).toBe("היסטוריה");
  });
});

describe("validation error routing", () => {
  it("routes fee field errors to the fees tab", () => {
    expect(
      resolveFinancialSettingsTabForFieldErrors({
        debtorTreatmentFeeShekels: ["שגיאה"],
      }),
    ).toBe("fees");
  });

  it("routes VAT field errors to the VAT tab", () => {
    expect(
      resolveFinancialSettingsTabForFieldErrors({
        vat_0_rate: ["שגיאה"],
      }),
    ).toBe("vat");
  });

  it("flags only the tab that owns the validation errors", () => {
    const errors = { vat_1_date: ["תאריך לא תקין"] };
    expect(tabHasValidationErrors("vat", errors)).toBe(true);
    expect(tabHasValidationErrors("fees", errors)).toBe(false);
  });
});

describe("tab state preservation contract", () => {
  it("keeps a stable tab id union for client state across panel switches", () => {
    for (const tabId of FINANCIAL_SETTINGS_TAB_IDS) {
      expect(typeof tabId).toBe("string");
      expect(FINANCIAL_SETTINGS_TAB_LABELS[tabId]).toBeTruthy();
    }
  });
});
