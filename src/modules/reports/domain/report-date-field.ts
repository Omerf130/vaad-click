export const ReportDateField = {
  CREATED: "created",
  SUBMITTED: "submitted",
  UPDATED: "updated",
} as const;

export type ReportDateField = (typeof ReportDateField)[keyof typeof ReportDateField];

export const REPORT_BUSINESS_TIMEZONE = "Asia/Jerusalem";
