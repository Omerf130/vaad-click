import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("building model indexes (CP6A invariants)", () => {
  const source = readFileSync(
    join(process.cwd(), "src/modules/buildings/infra/building.model.ts"),
    "utf8",
  );

  it("declares sparse unique representative assignment", () => {
    expect(source).toMatch(/designatedRepresentativeUserId/);
    expect(source).toMatch(/unique:\s*true/);
    expect(source).toMatch(/sparse:\s*true/);
  });

  it("declares partial unique normalized address for non-exception buildings", () => {
    expect(source).toMatch(/normalizedAddressKey/);
    expect(source).toMatch(/duplicateException:\s*null/);
  });
});
