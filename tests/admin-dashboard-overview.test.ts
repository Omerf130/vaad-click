import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("admin dashboard overview", () => {
  it("uses KPI dashboard instead of planned module placeholder grid", () => {
    const page = readFileSync(
      join(process.cwd(), "src/app/app/(lawyer-admin)/admin/page.tsx"),
      "utf8",
    );
    expect(page).toMatch(/AdminDashboardOverview/);
    expect(page).toMatch(/getAdminDashboardStats/);
    expect(page).not.toMatch(/ADMIN_NAV_ITEMS/);
    expect(page).not.toMatch(/AdminModuleCard/);
  });
});
