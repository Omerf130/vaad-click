import { DebtCaseError, DebtCaseErrorCode } from "@/modules/debt-cases/domain/debt-case-errors";

/** Inclusive calendar month `YYYY-MM`. */
export type DebtPeriodMonth = `${number}-${string}`;

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export function parseDebtPeriodMonth(value: string): DebtPeriodMonth | null {
  const trimmed = value.trim();
  if (!MONTH_PATTERN.test(trimmed)) {
    return null;
  }
  return trimmed as DebtPeriodMonth;
}

export function debtPeriodMonthToOrdinal(month: DebtPeriodMonth): number {
  const [yearStr, monthStr] = month.split("-");
  const year = Number(yearStr);
  const monthIndex = Number(monthStr);
  return year * 12 + (monthIndex - 1);
}

export function assertValidDebtPeriodRange(input: {
  periodStartMonth: DebtPeriodMonth;
  periodEndMonth: DebtPeriodMonth;
}): void {
  const start = debtPeriodMonthToOrdinal(input.periodStartMonth);
  const end = debtPeriodMonthToOrdinal(input.periodEndMonth);
  if (start > end) {
    throw new DebtCaseError(
      DebtCaseErrorCode.VALIDATION,
      "Debt period start must not be after end",
    );
  }
}

export function countMonthsInclusive(input: {
  periodStartMonth: DebtPeriodMonth;
  periodEndMonth: DebtPeriodMonth;
}): number {
  assertValidDebtPeriodRange(input);
  const start = debtPeriodMonthToOrdinal(input.periodStartMonth);
  const end = debtPeriodMonthToOrdinal(input.periodEndMonth);
  return end - start + 1;
}

/** True when ranges share at least one calendar month (inclusive). */
/** Expands an inclusive period to individual YYYY-MM months. */
export function expandDebtPeriodToMonths(input: {
  periodStartMonth: DebtPeriodMonth;
  periodEndMonth: DebtPeriodMonth;
}): DebtPeriodMonth[] {
  assertValidDebtPeriodRange(input);
  const startOrd = debtPeriodMonthToOrdinal(input.periodStartMonth);
  const endOrd = debtPeriodMonthToOrdinal(input.periodEndMonth);
  const months: DebtPeriodMonth[] = [];
  for (let ord = startOrd; ord <= endOrd; ord += 1) {
    const year = Math.floor(ord / 12);
    const monthIndex = (ord % 12) + 1;
    const monthStr = monthIndex < 10 ? `0${monthIndex}` : String(monthIndex);
    months.push(`${year}-${monthStr}` as DebtPeriodMonth);
  }
  return months;
}

export function debtPeriodMonthsOverlap(
  a: { periodStartMonth: DebtPeriodMonth; periodEndMonth: DebtPeriodMonth },
  b: { periodStartMonth: DebtPeriodMonth; periodEndMonth: DebtPeriodMonth },
): boolean {
  const aStart = debtPeriodMonthToOrdinal(a.periodStartMonth);
  const aEnd = debtPeriodMonthToOrdinal(a.periodEndMonth);
  const bStart = debtPeriodMonthToOrdinal(b.periodStartMonth);
  const bEnd = debtPeriodMonthToOrdinal(b.periodEndMonth);
  return aStart <= bEnd && bStart <= aEnd;
}
