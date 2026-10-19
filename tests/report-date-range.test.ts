import { describe, expect, it } from "vitest";

import { ReportDateField } from "@/modules/reports/domain/report-date-field";
import {
  mongoDateFieldPath,
  resolveReportDateRange,
} from "@/modules/reports/services/report-date-range";
import { ReportDatePreset } from "@/modules/reports/validation/report-filters.schema";

describe("report date range", () => {
  it("maps mongo paths for date fields", () => {
    expect(mongoDateFieldPath(ReportDateField.SUBMITTED)).toBe("submittedAt");
    expect(mongoDateFieldPath(ReportDateField.CREATED)).toBe("createdAt");
  });

  it("returns open bounds for all time", () => {
    const range = resolveReportDateRange({
      preset: ReportDatePreset.ALL,
      dateField: ReportDateField.CREATED,
    });
    expect(range.fromUtc).toBeNull();
    expect(range.toUtc).toBeNull();
  });
});
