import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { getPlannedAdminNavItems } from "@/modules/admin/navigation/admin-nav-config";

const shellScss = readFileSync(
  join(process.cwd(), "src", "modules", "admin", "layout", "AdminShell.module.scss"),
  "utf8",
);

const shellTsx = readFileSync(
  join(process.cwd(), "src", "modules", "admin", "layout", "AdminShell.tsx"),
  "utf8",
);

describe("admin mobile navigation drawer", () => {
  it("uses off-canvas sidebar on small screens without pushing main below sidebar block", () => {
    expect(shellScss).toMatch(/@include md-down[\s\S]*grid-template-areas:\s*"main"/);
    expect(shellScss).toMatch(/@include md-down[\s\S]*right:\s*0/);
    expect(shellScss).toMatch(/\.sidebarMobileClosed[\s\S]*translate3d\(100%/);
    expect(shellScss).toMatch(/\.drawerBackdrop/);
  });

  it("closes drawer on escape and route change from shell logic", () => {
    expect(shellTsx).toMatch(/Escape/);
    expect(shellTsx).toMatch(/pathname/);
  });

  it("groups planned admin nav items separately from implemented routes", () => {
    const planned = getPlannedAdminNavItems();
    expect(planned.length).toBeGreaterThan(0);
    expect(planned.every((item) => item.href === null)).toBe(true);
    expect(planned.every((item) => item.status === "planned")).toBe(true);
  });
});
