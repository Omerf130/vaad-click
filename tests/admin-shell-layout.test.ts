import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const root = join(process.cwd(), "src", "app", "app");

function readAppFile(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8");
}

describe("admin single-header layout structure", () => {
  it("uses a passthrough root /app layout without portal chrome", () => {
    const source = readAppFile("layout.tsx");
    expect(source).not.toMatch(/app-shell\.module\.scss/);
    expect(source).not.toMatch(/LogoutButton/);
    expect(source).toMatch(/return children/);
  });

  it("renders portal header only in the portal route group", () => {
    const portal = readAppFile("(portal)/layout.tsx");
    expect(portal).toMatch(/app-shell\.module\.scss/);
    expect(portal).toMatch(/requireAuthenticatedPortalSession/);
    expect(portal).toMatch(/LogoutButton/);
  });

  it("wraps lawyer admin routes in AdminShell without portal header", () => {
    const admin = readAppFile("(lawyer-admin)/layout.tsx");
    expect(admin).toMatch(/requireLawyerAdminPortal/);
    expect(admin).toMatch(/AdminShell/);
    expect(admin).not.toMatch(/app-shell\.module\.scss/);
    expect(admin).not.toMatch(/styles\.header/);
  });

  it("keeps admin chrome in AdminShell top bar only", () => {
    const shell = readFileSync(
      join(process.cwd(), "src", "modules", "admin", "layout", "AdminShell.tsx"),
      "utf8",
    );
    expect(shell).toMatch(/AdminTopBar/);
    expect(shell).not.toMatch(/app-shell/);
  });
});

describe("lawyer admin access boundaries (layout wiring)", () => {
  it("requires lawyer admin on all admin segment pages", () => {
    const pages = [
      "(lawyer-admin)/admin/page.tsx",
      "(lawyer-admin)/admin/buildings/page.tsx",
      "(lawyer-admin)/admin/management-companies/page.tsx",
      "(lawyer-admin)/admin/users/page.tsx",
      "(lawyer-admin)/admin/settings/page.tsx",
      "(lawyer-admin)/admin/financial-settings/page.tsx",
    ];
    for (const page of pages) {
      const source = readAppFile(page);
      expect(source).toMatch(/requireLawyerAdminPortal/);
    }
  });
});
