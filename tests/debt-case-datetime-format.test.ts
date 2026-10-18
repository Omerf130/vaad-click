import { describe, expect, it } from "vitest";

import { formatDebtCaseInstantHe } from "@/modules/debt-cases/presentation/debt-case-labels.he";

describe("formatDebtCaseInstantHe", () => {
  it("formats with fixed Israel timezone for SSR/client parity", () => {
    const a = formatDebtCaseInstantHe("2024-06-01T10:00:00.000Z");
    const b = formatDebtCaseInstantHe("2024-06-01T10:00:00.000Z");
    expect(a).toBe(b);
    expect(a.length).toBeGreaterThan(5);
  });
});
