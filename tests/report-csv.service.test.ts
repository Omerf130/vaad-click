import { describe, expect, it } from "vitest";

import { escapeCsvCell, buildDebtCasesCsv } from "@/modules/reports/services/report-csv.service";

describe("report csv", () => {
  it("escapes formula injection prefixes", () => {
    expect(escapeCsvCell("=1+1")).toBe("'=1+1");
    expect(escapeCsvCell("+123")).toBe("'+123");
  });

  it("includes utf-8 bom and headers", () => {
    const csv = buildDebtCasesCsv([]);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("מזהה תיק");
  });
});
