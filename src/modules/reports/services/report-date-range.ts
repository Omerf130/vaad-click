import "server-only";

import { ReportDateField, REPORT_BUSINESS_TIMEZONE } from "@/modules/reports/domain/report-date-field";
import { ReportDatePreset } from "@/modules/reports/validation/report-filters.schema";

export type ResolvedReportDateRange = {
  preset: ReportDatePreset;
  dateField: ReportDateField;
  /** Inclusive lower bound in UTC, or null for all time. */
  fromUtc: Date | null;
  /** Inclusive upper bound in UTC, or null for all time. */
  toUtc: Date | null;
  labelHe: string;
};

function startOfDayInJerusalem(year: number, month: number, day: number): Date {
  const probe = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: REPORT_BUSINESS_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(probe);
  const y = Number(parts.find((p) => p.type === "year")?.value);
  const m = Number(parts.find((p) => p.type === "month")?.value);
  const d = Number(parts.find((p) => p.type === "day")?.value);
  const offsetMs = probe.getTime() - Date.UTC(y, m - 1, d, 12, 0, 0);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0) - offsetMs);
}

function nowInJerusalemParts(): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: REPORT_BUSINESS_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  return {
    year: Number(parts.find((p) => p.type === "year")?.value),
    month: Number(parts.find((p) => p.type === "month")?.value),
    day: Number(parts.find((p) => p.type === "day")?.value),
  };
}

export function resolveReportDateRange(input: {
  preset: ReportDatePreset;
  dateField: ReportDateField;
  customFrom?: string | null;
  customTo?: string | null;
}): ResolvedReportDateRange {
  const { preset, dateField } = input;
  if (preset === ReportDatePreset.ALL) {
    return {
      preset,
      dateField,
      fromUtc: null,
      toUtc: null,
      labelHe: "כל הזמנים",
    };
  }

  const today = nowInJerusalemParts();
  const end = startOfDayInJerusalem(today.year, today.month, today.day);
  const endInclusive = new Date(end.getTime() + 24 * 60 * 60 * 1000 - 1);

  if (preset === ReportDatePreset.CUSTOM) {
    const fromUtc = new Date(`${input.customFrom}T00:00:00.000Z`);
    const toUtc = new Date(`${input.customTo}T23:59:59.999Z`);
    return {
      preset,
      dateField,
      fromUtc,
      toUtc,
      labelHe: `${input.customFrom} – ${input.customTo}`,
    };
  }

  let fromUtc: Date;
  let labelHe: string;
  if (preset === ReportDatePreset.LAST_30) {
    fromUtc = new Date(end.getTime() - 29 * 24 * 60 * 60 * 1000);
    labelHe = "30 הימים האחרונים";
  } else if (preset === ReportDatePreset.LAST_90) {
    fromUtc = new Date(end.getTime() - 89 * 24 * 60 * 60 * 1000);
    labelHe = "90 הימים האחרונים";
  } else {
    fromUtc = startOfDayInJerusalem(today.year, 1, 1);
    labelHe = `שנת ${today.year}`;
  }

  return { preset, dateField, fromUtc, toUtc: endInclusive, labelHe };
}

export function mongoDateFieldPath(dateField: ReportDateField): string {
  switch (dateField) {
    case ReportDateField.SUBMITTED:
      return "submittedAt";
    case ReportDateField.UPDATED:
      return "updatedAt";
    case ReportDateField.CREATED:
    default:
      return "createdAt";
  }
}
