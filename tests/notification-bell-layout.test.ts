import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const bellScss = readFileSync(
  join(process.cwd(), "src", "modules", "notifications", "ui", "NotificationBell.module.scss"),
  "utf8",
);

describe("notification bell responsive layout", () => {
  it("anchors panel with physical right on desktop and viewport-safe fixed panel on mobile", () => {
    expect(bellScss).toMatch(/\.panel[\s\S]*right:\s*0/);
    expect(bellScss).toMatch(/@include md-down[\s\S]*position:\s*fixed/);
    expect(bellScss).toMatch(/left:\s*max/);
  });

  it("positions unread badge on physical top-right of trigger", () => {
    expect(bellScss).toMatch(/\.badge[\s\S]*right:\s*-0\.2rem/);
  });
});
