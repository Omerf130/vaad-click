import type { ReportFilters } from "@/modules/reports/validation/report-filters.schema";

export function buildReportQuery(filters: ReportFilters, tab: string): string {
  const params = new URLSearchParams();
  params.set("tab", tab);
  params.set("preset", filters.preset);
  params.set("dateField", filters.dateField);
  if (filters.customFrom) params.set("from", filters.customFrom);
  if (filters.customTo) params.set("to", filters.customTo);
  if (filters.buildingId) params.set("buildingId", filters.buildingId);
  if (filters.managementCompanyId) params.set("managementCompanyId", filters.managementCompanyId);
  if (filters.workflowStatus) params.set("status", filters.workflowStatus);
  if (filters.q) params.set("q", filters.q);
  if (filters.page > 1) params.set("page", String(filters.page));
  if (filters.sort !== "newest") params.set("sort", filters.sort);
  return params.toString();
}
