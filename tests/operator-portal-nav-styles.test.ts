import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const navScss = readFileSync(
  join(process.cwd(), "src", "modules", "portal", "ui", "OperatorPortalShell.module.scss"),
  "utf8",
);

describe("operator portal nav surface", () => {
  it("avoids white tile backgrounds on links", () => {
    expect(navScss).not.toMatch(/\.navLinkActive[\s\S]*background:\s*\$color-bg-surface/);
    expect(navScss).toMatch(/\.navLinkActive[\s\S]*background:\s*transparent/);
  });
});
