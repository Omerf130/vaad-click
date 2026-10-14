import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const portalRoot = join(process.cwd(), "src/app/app/(portal)");

describe("portal route guards (CP6A)", () => {
  it("uses operational access on /app home only", () => {
    const home = readFileSync(join(portalRoot, "page.tsx"), "utf8");
    expect(home).toMatch(/requireOperationalPortalAccess/);
  });

  it("exposes account-status for authenticated non-operational users", () => {
    const status = readFileSync(join(portalRoot, "account-status/page.tsx"), "utf8");
    expect(status).toMatch(/requireAccountStatusPageAccess/);
  });

  it("scopes building detail routes with requireBuildingPortalAccess", () => {
    const detail = readFileSync(
      join(portalRoot, "buildings/[buildingId]/page.tsx"),
      "utf8",
    );
    expect(detail).toMatch(/requireBuildingPortalAccess/);
  });
});
