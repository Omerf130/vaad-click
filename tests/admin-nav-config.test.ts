import { describe, expect, it } from "vitest";

import {
  ADMIN_NAV_ITEMS,
  getImplementedAdminNavItems,
  isAdminNavItemActive,
} from "@/modules/admin/navigation/admin-nav-config";

describe("admin navigation configuration", () => {
  it("lists overview and settings as implemented routes", () => {
    const implemented = getImplementedAdminNavItems();
    expect(implemented.map((item) => item.id)).toEqual([
      "overview",
      "buildings",
      "management_companies",
      "users",
      "debt_cases",
      "settings",
    ]);
  });

  it("marks future modules as planned without hrefs", () => {
    const planned = ADMIN_NAV_ITEMS.filter((item) => item.status === "planned");
    expect(planned.length).toBeGreaterThanOrEqual(4);
    for (const item of planned) {
      expect(item.href).toBeNull();
      expect(item.unavailableReasonHe).toBeTruthy();
    }
  });

  it("highlights overview only on exact dashboard path", () => {
    const overview = ADMIN_NAV_ITEMS.find((item) => item.id === "overview")!;
    expect(isAdminNavItemActive("/app/admin", overview)).toBe(true);
    expect(isAdminNavItemActive("/app/admin/settings", overview)).toBe(false);
    expect(isAdminNavItemActive("/app/admin/financial-settings", overview)).toBe(false);
  });

  it("highlights users for list and detail routes", () => {
    const users = ADMIN_NAV_ITEMS.find((item) => item.id === "users")!;
    expect(isAdminNavItemActive("/app/admin/users", users)).toBe(true);
    expect(isAdminNavItemActive("/app/admin/users/abc", users)).toBe(true);
    expect(isAdminNavItemActive("/app/admin", users)).toBe(false);
  });

  it("highlights settings for settings hub and financial settings", () => {
    const settings = ADMIN_NAV_ITEMS.find((item) => item.id === "settings")!;
    expect(isAdminNavItemActive("/app/admin/settings", settings)).toBe(true);
    expect(isAdminNavItemActive("/app/admin/financial-settings", settings)).toBe(true);
    expect(isAdminNavItemActive("/app/admin", settings)).toBe(false);
  });

  it("never marks planned items active", () => {
    for (const item of ADMIN_NAV_ITEMS.filter((item) => item.status === "planned")) {
      expect(isAdminNavItemActive("/app/admin", item)).toBe(false);
      expect(isAdminNavItemActive("/app/admin/buildings", item)).toBe(false);
    }
  });
});
