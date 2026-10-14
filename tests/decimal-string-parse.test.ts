import { describe, expect, it } from "vitest";

import {
  formatMinorUnitsAsShekels,
  parsePercentStringToBasisPoints,
  parseShekelsStringToMinorUnits,
} from "@/shared/financial/decimal-string-parse";

describe("decimal string parsing", () => {
  it("parses shekel strings into minor units without floating point", () => {
    expect(parseShekelsStringToMinorUnits("277")).toEqual({ ok: true, scaledInteger: 27700 });
    expect(parseShekelsStringToMinorUnits("277.50")).toEqual({ ok: true, scaledInteger: 27750 });
    expect(parseShekelsStringToMinorUnits("0.01")).toEqual({ ok: true, scaledInteger: 1 });
  });

  it("rejects too many decimal places in money input", () => {
    const result = parseShekelsStringToMinorUnits("277.001");
    expect(result.ok).toBe(false);
  });

  it("parses percent strings into basis points", () => {
    expect(parsePercentStringToBasisPoints("20")).toEqual({ ok: true, scaledInteger: 2000 });
    expect(parsePercentStringToBasisPoints("20.5")).toEqual({ ok: true, scaledInteger: 2050 });
  });

  it("formats minor units back to shekels", () => {
    expect(formatMinorUnitsAsShekels(27700)).toBe("277.00");
    expect(formatMinorUnitsAsShekels(27750)).toBe("277.50");
  });
});
