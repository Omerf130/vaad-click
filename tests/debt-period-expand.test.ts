import { describe, expect, it } from "vitest";

import { expandDebtPeriodToMonths } from "@/modules/debt-cases/domain/debt-period";

describe("expandDebtPeriodToMonths", () => {
  it("expands inclusive range", () => {
    expect(
      expandDebtPeriodToMonths({
        periodStartMonth: "2024-11",
        periodEndMonth: "2025-02",
      }),
    ).toEqual(["2024-11", "2024-12", "2025-01", "2025-02"]);
  });
});
