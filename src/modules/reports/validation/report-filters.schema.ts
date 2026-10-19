import { z } from "zod";

import { DebtCaseWorkflowStatus } from "@/modules/debt-cases/domain/debt-case-workflow-status";
import { ReportDateField } from "@/modules/reports/domain/report-date-field";

export const ReportDatePreset = {
  LAST_30: "last_30",
  LAST_90: "last_90",
  THIS_YEAR: "this_year",
  ALL: "all",
  CUSTOM: "custom",
} as const;

export type ReportDatePreset = (typeof ReportDatePreset)[keyof typeof ReportDatePreset];

const uuidOptional = z.string().uuid().optional().nullable();

export const reportFiltersSchema = z
  .object({
    preset: z.enum(
      Object.values(ReportDatePreset) as [ReportDatePreset, ...ReportDatePreset[]],
    ),
    dateField: z.enum([
      ReportDateField.CREATED,
      ReportDateField.SUBMITTED,
      ReportDateField.UPDATED,
    ]),
    customFrom: z.string().trim().optional().nullable(),
    customTo: z.string().trim().optional().nullable(),
    buildingId: uuidOptional,
    managementCompanyId: uuidOptional,
    workflowStatus: z
      .enum(Object.values(DebtCaseWorkflowStatus) as [DebtCaseWorkflowStatus, ...DebtCaseWorkflowStatus[]])
      .optional()
      .nullable(),
    q: z.string().trim().max(80).optional().nullable(),
    page: z.coerce.number().int().min(1).max(500).default(1),
    pageSize: z.coerce.number().int().min(10).max(100).default(25),
    sort: z.enum(["newest", "oldest", "amount_desc", "amount_asc"]).default("newest"),
  })
  .superRefine((data, ctx) => {
    if (data.preset !== ReportDatePreset.CUSTOM) {
      return;
    }
    if (!data.customFrom || !data.customTo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "נדרש טווח תאריכים מותאם",
        path: ["customFrom"],
      });
      return;
    }
    const from = Date.parse(`${data.customFrom}T00:00:00.000Z`);
    const to = Date.parse(`${data.customTo}T23:59:59.999Z`);
    if (!Number.isFinite(from) || !Number.isFinite(to) || from > to) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "טווח תאריכים לא תקין",
        path: ["customFrom"],
      });
      return;
    }
    const maxSpanMs = 366 * 24 * 60 * 60 * 1000;
    if (to - from > maxSpanMs) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "טווח מותאם מוגבל ל-366 יום",
        path: ["customTo"],
      });
    }
  });

export type ReportFilters = z.infer<typeof reportFiltersSchema>;

export function parseReportFiltersFromSearchParams(
  raw: Record<string, string | string[] | undefined>,
): ReportFilters {
  const pick = (key: string) => {
    const v = raw[key];
    return Array.isArray(v) ? v[0] : v;
  };
  return reportFiltersSchema.parse({
    preset: pick("preset") ?? ReportDatePreset.LAST_90,
    dateField: pick("dateField") ?? ReportDateField.SUBMITTED,
    customFrom: pick("from") ?? null,
    customTo: pick("to") ?? null,
    buildingId: pick("buildingId") ?? null,
    managementCompanyId: pick("managementCompanyId") ?? null,
    workflowStatus: pick("status") ?? null,
    q: pick("q") ?? null,
    page: pick("page") ?? 1,
    pageSize: pick("pageSize") ?? 25,
    sort: pick("sort") ?? "newest",
  });
}
