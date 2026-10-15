import "server-only";

import type { ClientSession } from "mongoose";
import { MongoServerError } from "mongodb";

import { DebtCaseError, DebtCaseErrorCode } from "@/modules/debt-cases/domain/debt-case-errors";
import { DebtCaseWorkflowStatus } from "@/modules/debt-cases/domain/debt-case-workflow-status";
import type { DebtPeriodMonth } from "@/modules/debt-cases/domain/debt-period";
import { expandDebtPeriodToMonths } from "@/modules/debt-cases/domain/debt-period";
import { DebtCasePeriodClaim } from "@/modules/debt-cases/infra/debt-case-period-claim.model";

export async function claimDebtCasePeriodMonths(input: {
  buildingId: string;
  apartmentKeyNormalized: string;
  periodStartMonth: DebtPeriodMonth;
  periodEndMonth: DebtPeriodMonth;
  debtCaseId: string;
  session: ClientSession;
}): Promise<void> {
  const months = expandDebtPeriodToMonths({
    periodStartMonth: input.periodStartMonth,
    periodEndMonth: input.periodEndMonth,
  });

  try {
    await DebtCasePeriodClaim.insertMany(
      months.map((periodMonth) => ({
        buildingId: input.buildingId,
        apartmentKeyNormalized: input.apartmentKeyNormalized,
        periodMonth,
        debtCaseId: input.debtCaseId,
      })),
      { session: input.session, ordered: false },
    );
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) {
      throw new DebtCaseError(
        DebtCaseErrorCode.DUPLICATE_OVERLAP,
        "Overlapping debt period already claimed for this apartment",
      );
    }
    throw error;
  }
}

export async function releaseDebtCasePeriodClaims(input: {
  debtCaseId: string;
  session: ClientSession;
}): Promise<void> {
  await DebtCasePeriodClaim.deleteMany({ debtCaseId: input.debtCaseId }, { session: input.session });
}

export async function releaseClaimsForTerminalCase(input: {
  debtCaseId: string;
  workflowStatus: DebtCaseWorkflowStatus;
  session: ClientSession;
}): Promise<void> {
  if (
    input.workflowStatus === DebtCaseWorkflowStatus.REJECTED ||
    input.workflowStatus === DebtCaseWorkflowStatus.CLOSED_MANUAL
  ) {
    await releaseDebtCasePeriodClaims({ debtCaseId: input.debtCaseId, session: input.session });
  }
}

export async function replaceDebtCasePeriodClaims(input: {
  debtCaseId: string;
  buildingId: string;
  apartmentKeyNormalized: string;
  periodStartMonth: DebtPeriodMonth;
  periodEndMonth: DebtPeriodMonth;
  session: ClientSession;
}): Promise<void> {
  await releaseDebtCasePeriodClaims({ debtCaseId: input.debtCaseId, session: input.session });
  await claimDebtCasePeriodMonths({
    buildingId: input.buildingId,
    apartmentKeyNormalized: input.apartmentKeyNormalized,
    periodStartMonth: input.periodStartMonth,
    periodEndMonth: input.periodEndMonth,
    debtCaseId: input.debtCaseId,
    session: input.session,
  });
}
