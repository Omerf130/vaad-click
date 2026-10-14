import { describe, expect, it } from "vitest";

import { normalizeBuildingAddressKey } from "@/modules/buildings/domain/normalize-building-address";

describe("normalizeBuildingAddressKey", () => {
  it("normalizes case and whitespace for deduplication", () => {
    const a = normalizeBuildingAddressKey({
      city: "  Tel Aviv ",
      street: "Herzl",
      houseNumber: "1",
    });
    const b = normalizeBuildingAddressKey({
      city: "tel aviv",
      street: "herzl",
      houseNumber: "1",
    });
    expect(a).toBe(b);
    expect(a).toBe("tel aviv|herzl|1");
  });
});
