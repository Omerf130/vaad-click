import {
  debtPeriodMonthsOverlap,
  type DebtPeriodMonth,
} from "@/modules/debt-cases/domain/debt-period";
import {
  DebtCaseValidationFlagCode,
  DebtCaseValidationFlagSeverity,
  type DebtCaseValidationFlag,
} from "@/modules/debt-cases/domain/debt-case-validation-flag";
import {
  isOpenDebtCaseWorkflowStatus,
  isTerminalDebtCaseWorkflowStatus,
  type DebtCaseWorkflowStatus,
} from "@/modules/debt-cases/domain/debt-case-workflow-status";

export type DebtCaseDuplicateCandidate = {
  debtCaseId: string;
  buildingId: string;
  apartmentKeyNormalized: string;
  periodStartMonth: DebtPeriodMonth;
  periodEndMonth: DebtPeriodMonth;
  workflowStatus: DebtCaseWorkflowStatus;
  letterSentAtIso: string | null;
  debtorNameNormalized: string | null;
};

export type OverlappingOpenCaseResult = {
  isBlockingOverlap: boolean;
  conflictingCaseId: string | null;
};

/**
 * Pure overlap check — does not guarantee concurrency safety (DB transaction required later).
 */
export function findOverlappingOpenCase(input: {
  buildingId: string;
  apartmentKeyNormalized: string;
  periodStartMonth: DebtPeriodMonth;
  periodEndMonth: DebtPeriodMonth;
  excludeDebtCaseId?: string;
  candidates: readonly DebtCaseDuplicateCandidate[];
}): OverlappingOpenCaseResult {
  for (const candidate of input.candidates) {
    if (candidate.buildingId !== input.buildingId) {
      continue;
    }
    if (candidate.apartmentKeyNormalized !== input.apartmentKeyNormalized) {
      continue;
    }
    if (input.excludeDebtCaseId && candidate.debtCaseId === input.excludeDebtCaseId) {
      continue;
    }
    if (!isOpenDebtCaseWorkflowStatus(candidate.workflowStatus)) {
      continue;
    }
    if (
      debtPeriodMonthsOverlap(
        {
          periodStartMonth: input.periodStartMonth,
          periodEndMonth: input.periodEndMonth,
        },
        {
          periodStartMonth: candidate.periodStartMonth,
          periodEndMonth: candidate.periodEndMonth,
        },
      )
    ) {
      return { isBlockingOverlap: true, conflictingCaseId: candidate.debtCaseId };
    }
  }
  return { isBlockingOverlap: false, conflictingCaseId: null };
}

export function normalizeDebtorNameForMatching(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

/** @deprecated Use normalizeDebtorNameForMatching */
export const normalizeDebtorDisplayNameForMatching = normalizeDebtorNameForMatching;

export type RepeatDebtorWarningResult = {
  isRepeatWarning: boolean;
  priorClosedCaseId: string | null;
};

/** Soft warning when a closed case existed for same building + apartment + similar name. */
export function detectRepeatDebtorWarning(input: {
  buildingId: string;
  apartmentKeyNormalized: string;
  legalDebtorMatchingLabel: string;
  candidates: readonly DebtCaseDuplicateCandidate[];
}): RepeatDebtorWarningResult {
  const normalizedName = normalizeDebtorNameForMatching(input.legalDebtorMatchingLabel);
  if (!normalizedName) {
    return { isRepeatWarning: false, priorClosedCaseId: null };
  }

  for (const candidate of input.candidates) {
    if (candidate.buildingId !== input.buildingId) {
      continue;
    }
    if (candidate.apartmentKeyNormalized !== input.apartmentKeyNormalized) {
      continue;
    }
    if (!isTerminalDebtCaseWorkflowStatus(candidate.workflowStatus)) {
      continue;
    }
    const candidateName = candidate.debtorNameNormalized ?? "";
    if (candidateName && candidateName === normalizedName) {
      return { isRepeatWarning: true, priorClosedCaseId: candidate.debtCaseId };
    }
  }
  return { isRepeatWarning: false, priorClosedCaseId: null };
}

export function assertSuccessorCaseAllowed(input: {
  predecessorLetterSentAtIso: string | null;
}): DebtCaseValidationFlag | null {
  if (!input.predecessorLetterSentAtIso) {
    return {
      code: DebtCaseValidationFlagCode.SUCCESSOR_REQUIRES_SENT_LETTER,
      severity: DebtCaseValidationFlagSeverity.BLOCK,
      messageHe: "תיק המשך מותר רק לאחר שנשלח מכתב על התיק הקודם",
    };
  }
  return null;
}

export function overlappingOpenCaseFlag(
  conflictingCaseId: string,
): DebtCaseValidationFlag {
  return {
    code: DebtCaseValidationFlagCode.OVERLAPPING_OPEN_CASE,
    severity: DebtCaseValidationFlagSeverity.BLOCK,
    messageHe: `קיים תיק פתוח חופף לדירה ולתקופה (${conflictingCaseId})`,
  };
}
