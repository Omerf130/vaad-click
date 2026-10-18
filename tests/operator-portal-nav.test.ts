import { describe, expect, it } from "vitest";

import { getOperatorNavItems } from "@/modules/portal/presentation/operator-portal-nav";

describe("operator portal navigation", () => {
  it("includes dashboard and buildings for all operators", () => {
    const items = getOperatorNavItems({});
    expect(items.map((item) => item.href)).toEqual(["/app", "/app/buildings"]);
  });

  it("adds primary building shortcut for building representatives", () => {
    const buildingId = "11111111-1111-4111-8111-111111111111";
    const items = getOperatorNavItems({ primaryBuildingId: buildingId });
    expect(items.some((item) => item.href === `/app/buildings/${buildingId}`)).toBe(true);
    expect(items.find((item) => item.labelHe === "הבניין שלי")?.href).toBe(
      `/app/buildings/${buildingId}`,
    );
  });
});
