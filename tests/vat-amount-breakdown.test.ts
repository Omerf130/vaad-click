import { describe, expect, it } from "vitest";

import { deriveNetAndVatFromGrossMinor } from "@/shared/financial/vat-amount-breakdown";

describe("deriveNetAndVatFromGrossMinor", () => {
  it("splits 18% VAT-inclusive amounts without double VAT", () => {
    const result = deriveNetAndVatFromGrossMinor({
      grossMinor: 11_800,
      vatRateBasisPoints: 1800,
    });
    expect(result.netMinor).toBe(10_000);
    expect(result.vatMinor).toBe(1_800);
    expect(result.netMinor + result.vatMinor).toBe(result.grossMinor);
  });

  it("rounds net half-up for awkward gross values", () => {
    const result = deriveNetAndVatFromGrossMinor({
      grossMinor: 100,
      vatRateBasisPoints: 1800,
    });
    expect(result.netMinor + result.vatMinor).toBe(100);
    expect(result.netMinor).toBeGreaterThanOrEqual(0);
    expect(result.vatMinor).toBeGreaterThanOrEqual(0);
  });

  it("treats zero VAT rate as all net", () => {
    const result = deriveNetAndVatFromGrossMinor({
      grossMinor: 500,
      vatRateBasisPoints: 0,
    });
    expect(result).toEqual({
      grossMinor: 500,
      netMinor: 500,
      vatMinor: 0,
      vatRateBasisPoints: 0,
    });
  });
});
