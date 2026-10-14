import { describe, expect, it } from "vitest";

import { selectApplicableVersionByEffectiveFrom } from "@/modules/financial-settings/domain/effective-date-resolution";
import { startOfDayJerusalem } from "@/shared/time/jerusalem-calendar";

describe("financial settings effective date resolution", () => {
  const v1 = {
    id: "v1",
    effectiveFrom: startOfDayJerusalem("2026-11-01"),
  };
  const v2 = {
    id: "v2",
    effectiveFrom: startOfDayJerusalem("2026-12-01"),
  };

  it("returns null before the first effective date", () => {
    const asOf = startOfDayJerusalem("2026-10-14");
    expect(selectApplicableVersionByEffectiveFrom([v1, v2], asOf)).toBeNull();
  });

  it("does not apply a future-dated version early", () => {
    const asOf = startOfDayJerusalem("2026-11-15");
    expect(selectApplicableVersionByEffectiveFrom([v1, v2], asOf)?.id).toBe("v1");
  });

  it("selects the latest started version on and after its effective date", () => {
    const asOf = startOfDayJerusalem("2026-12-15");
    expect(selectApplicableVersionByEffectiveFrom([v1, v2], asOf)?.id).toBe("v2");
  });
});
