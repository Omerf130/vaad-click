import { describe, expect, it } from "vitest";

import { ReportDatePreset } from "@/modules/reports/validation/report-filters.schema";
import { reportFiltersSchema } from "@/modules/reports/validation/report-filters.schema";

describe("report filters schema", () => {
  it("rejects custom preset without dates", () => {
    const result = reportFiltersSchema.safeParse({
      preset: ReportDatePreset.CUSTOM,
      dateField: "created",
      page: 1,
      pageSize: 25,
      sort: "newest",
    });
    expect(result.success).toBe(false);
  });

  it("rejects custom range longer than 366 days", () => {
    const result = reportFiltersSchema.safeParse({
      preset: ReportDatePreset.CUSTOM,
      dateField: "created",
      customFrom: "2020-01-01",
      customTo: "2021-06-01",
      page: 1,
      pageSize: 25,
      sort: "newest",
    });
    expect(result.success).toBe(false);
  });

  it("accepts last 90 preset", () => {
    const result = reportFiltersSchema.safeParse({
      preset: ReportDatePreset.LAST_90,
      dateField: "submitted",
      page: 1,
      pageSize: 25,
      sort: "newest",
    });
    expect(result.success).toBe(true);
  });
});
