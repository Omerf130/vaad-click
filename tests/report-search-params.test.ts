import { describe, expect, it } from "vitest";

import { buildReportQuery } from "@/modules/reports/presentation/report-search-params";
import { ReportDateField } from "@/modules/reports/domain/report-date-field";
import { ReportDatePreset } from "@/modules/reports/validation/report-filters.schema";

describe("buildReportQuery", () => {
  it("preserves filters and page for pagination", () => {
    const q = buildReportQuery(
      {
        preset: ReportDatePreset.LAST_30,
        dateField: ReportDateField.SUBMITTED,
        customFrom: null,
        customTo: null,
        buildingId: null,
        managementCompanyId: null,
        workflowStatus: null,
        q: "abc",
        page: 3,
        pageSize: 25,
        sort: "newest",
      },
      "cases",
    );
    expect(q).toContain("page=3");
    expect(q).toContain("q=abc");
    expect(q).toContain("tab=cases");
  });
});
