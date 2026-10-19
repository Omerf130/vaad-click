import "server-only";

import { formatDebtCaseInstantHe } from "@/modules/debt-cases/presentation/debt-case-labels.he";
import type { ReportDebtCaseRow } from "@/modules/reports/services/report-debt-case-query.service";

const UTF8_BOM = "\uFEFF";

/** Prevent CSV formula injection in Excel. */
export function escapeCsvCell(value: string): string {
  const trimmed = value.trim();
  if (/^[=+\-@]/.test(trimmed)) {
    return `'${value.replace(/"/g, '""')}`;
  }
  if (value.includes('"') || value.includes(",") || value.includes("\n") || value.includes("\r")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatAmountMinor(minor: number | null): string {
  if (minor == null || minor <= 0) {
    return "";
  }
  return (minor / 100).toFixed(2);
}

export function buildDebtCasesCsv(rows: ReportDebtCaseRow[]): string {
  const headers = [
    "מזהה תיק",
    "בניין",
    "דירה",
    "סטטוס תיק",
    "סטטוס בדיקה",
    "נוצר",
    "הוגש",
    "עודכן",
    "סכום חוב רשום (₪)",
  ];

  const lines = [headers.map(escapeCsvCell).join(",")];
  for (const row of rows) {
    lines.push(
      [
        row.debtCaseId,
        row.buildingDisplayName,
        row.apartmentNumberDisplay,
        row.workflowStatusHe,
        row.lawyerReviewStatus,
        formatDebtCaseInstantHe(row.createdAtIso),
        row.submittedAtIso ? formatDebtCaseInstantHe(row.submittedAtIso) : "",
        formatDebtCaseInstantHe(row.updatedAtIso),
        formatAmountMinor(row.principalAmountMinor),
      ]
        .map((cell) => escapeCsvCell(String(cell)))
        .join(","),
    );
  }

  return UTF8_BOM + lines.join("\r\n");
}

export function buildDebtCasesExportFilename(input: { prefix: string; generatedAt: Date }): string {
  const stamp = input.generatedAt.toISOString().slice(0, 10);
  return `${input.prefix}-debt-cases-${stamp}.csv`;
}
