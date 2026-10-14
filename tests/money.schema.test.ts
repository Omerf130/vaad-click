import { describe, expect, it } from "vitest";

import { moneyAmountSchema } from "@/shared/financial/money.schema";

describe("money amount schema", () => {
  it("accepts integer minor units for ILS", () => {
    const parsed = moneyAmountSchema.parse({ currency: "ILS", amountMinor: 27700 });
    expect(parsed.amountMinor).toBe(27700);
  });

  it("rejects fractional minor units", () => {
    expect(() =>
      moneyAmountSchema.parse({ currency: "ILS", amountMinor: 277.5 }),
    ).toThrow();
  });

  it("rejects negative amounts", () => {
    expect(() =>
      moneyAmountSchema.parse({ currency: "ILS", amountMinor: -1 }),
    ).toThrow();
  });
});
