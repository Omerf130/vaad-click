import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("data list UI contracts", () => {
  it("uses responsive card lists in lawyer debt-case queue", () => {
    const table = readFileSync(
      join(process.cwd(), "src", "modules", "debt-cases", "ui", "lawyer", "LawyerDebtCaseQueueTable.tsx"),
      "utf8",
    );
    expect(table).toMatch(/mobileOnly/);
    expect(table).toMatch(/desktopOnly/);
    expect(table).toMatch(/ListPagination/);
  });

  it("wraps report filters in collapsible panel", () => {
    const form = readFileSync(
      join(process.cwd(), "src", "modules", "reports", "ui", "ReportFiltersForm.tsx"),
      "utf8",
    );
    expect(form).toMatch(/CollapsibleFilterPanel/);
  });

  it("uses unread badge instead of bullet in notification bell", () => {
    const bell = readFileSync(
      join(process.cwd(), "src", "modules", "notifications", "ui", "NotificationBell.tsx"),
      "utf8",
    );
    expect(bell).toMatch(/unreadBadge/);
    expect(bell).not.toMatch(/"● "/);
  });
});
