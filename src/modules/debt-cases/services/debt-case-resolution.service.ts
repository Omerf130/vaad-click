import "server-only";

import mongoose, { Types } from "mongoose";

import { assertDebtCaseWorkflowTransition } from "@/modules/debt-cases/domain/debt-case-status-transitions";
import {
  DebtCaseResolutionKind,
  resolutionRequiresReasonHe,
} from "@/modules/debt-cases/domain/debt-case-resolution-kind";
import { DebtCaseError, DebtCaseErrorCode } from "@/modules/debt-cases/domain/debt-case-errors";
import { DebtCaseWorkflowStatus } from "@/modules/debt-cases/domain/debt-case-workflow-status";
import { computeDebtCaseBalanceSummary } from "@/modules/debt-cases/domain/debt-case-payment-ledger.compute";
import { DebtCase } from "@/modules/debt-cases/infra/debt-case.model";
import { assertLawyerAdminDebtCaseReview } from "@/modules/debt-cases/services/debt-case-authorization.service";
import {
  recordDebtCaseReopenedEvent,
  recordDebtCaseResolutionEvent,
} from "@/modules/debt-cases/services/debt-case-payment-audit.service";
import { loadFinanceContextForDebtCase } from "@/modules/debt-cases/services/debt-case-manual-payment.service";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import { connectMongo } from "@/shared/db/connect";

export async function resolveDebtCaseManually(input: {
  context: AuthenticatedContext;
  debtCaseId: string;
  expectedRevision: number;
  resolutionKind: DebtCaseResolutionKind;
  resolutionReasonHe?: string | null;
  correlationId?: string;
}): Promise<void> {
  await assertLawyerAdminDebtCaseReview({ context: input.context });
  const reason = input.resolutionReasonHe?.trim() ?? "";

  if (resolutionRequiresReasonHe(input.resolutionKind) && reason.length < 3) {
    throw new DebtCaseError(DebtCaseErrorCode.VALIDATION, "Resolution reason required");
  }

  if (input.resolutionKind === DebtCaseResolutionKind.CLOSED_WITHOUT_COLLECTION && reason.length < 3) {
    throw new DebtCaseError(DebtCaseErrorCode.VALIDATION, "Closure without collection requires a reason");
  }

  await connectMongo();
  const finance = await loadFinanceContextForDebtCase(input.debtCaseId);
  const summary = computeDebtCaseBalanceSummary({
    letterTotalDueMinor: finance.letterTotalDueMinor,
    casePrincipalMinor: 0,
    entries: finance.entries,
  });

  if (
    input.resolutionKind === DebtCaseResolutionKind.PAID_IN_FULL &&
    summary.outstandingBalanceMinor > 0
  ) {
    throw new DebtCaseError(
      DebtCaseErrorCode.VALIDATION,
      "Paid in full resolution requires zero outstanding balance from reported payments",
    );
  }

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const doc = await DebtCase.findOne({ debtCaseId: input.debtCaseId }).session(session);
      if (!doc) {
        throw new DebtCaseError(DebtCaseErrorCode.NOT_FOUND, "Debt case not found");
      }
      if (doc.revision !== input.expectedRevision) {
        throw new DebtCaseError(DebtCaseErrorCode.REVISION_CONFLICT, "Revision conflict");
      }
      if (doc.workflowStatus !== DebtCaseWorkflowStatus.LETTER_SENT) {
        throw new DebtCaseError(
          DebtCaseErrorCode.INVALID_STATUS_TRANSITION,
          "Resolution allowed only from letter_sent",
        );
      }

      assertDebtCaseWorkflowTransition({
        from: DebtCaseWorkflowStatus.LETTER_SENT,
        to: DebtCaseWorkflowStatus.CLOSED_MANUAL,
        context: {
          role: input.context.user.role,
          accountStatus: input.context.user.accountStatus,
        },
      });

      const now = new Date();
      doc.workflowStatus = DebtCaseWorkflowStatus.CLOSED_MANUAL;
      doc.caseResolutionKind = input.resolutionKind;
      doc.caseResolutionReasonHe = reason || null;
      doc.caseResolutionAt = now;
      doc.caseResolutionByUserId = new Types.ObjectId(input.context.user.id);
      doc.updatedByUserId = new Types.ObjectId(input.context.user.id);
      doc.revision += 1;
      await doc.save({ session });

      await recordDebtCaseResolutionEvent(
        {
          context: input.context,
          debtCaseId: input.debtCaseId,
          buildingId: doc.buildingId,
          resolutionKind: input.resolutionKind,
          correlationId: input.correlationId,
        },
        session,
      );
    });
  } finally {
    await session.endSession();
  }
}

export async function reopenDebtCaseAfterManualClosure(input: {
  context: AuthenticatedContext;
  debtCaseId: string;
  expectedRevision: number;
  correlationId?: string;
}): Promise<void> {
  await assertLawyerAdminDebtCaseReview({ context: input.context });
  await connectMongo();

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const doc = await DebtCase.findOne({ debtCaseId: input.debtCaseId }).session(session);
      if (!doc) {
        throw new DebtCaseError(DebtCaseErrorCode.NOT_FOUND, "Debt case not found");
      }
      if (doc.revision !== input.expectedRevision) {
        throw new DebtCaseError(DebtCaseErrorCode.REVISION_CONFLICT, "Revision conflict");
      }
      if (doc.workflowStatus !== DebtCaseWorkflowStatus.CLOSED_MANUAL) {
        throw new DebtCaseError(
          DebtCaseErrorCode.INVALID_STATUS_TRANSITION,
          "Reopen allowed only from closed_manual",
        );
      }

      assertDebtCaseWorkflowTransition({
        from: DebtCaseWorkflowStatus.CLOSED_MANUAL,
        to: DebtCaseWorkflowStatus.LETTER_SENT,
        context: {
          role: input.context.user.role,
          accountStatus: input.context.user.accountStatus,
        },
      });

      doc.workflowStatus = DebtCaseWorkflowStatus.LETTER_SENT;
      doc.updatedByUserId = new Types.ObjectId(input.context.user.id);
      doc.revision += 1;
      await doc.save({ session });

      await recordDebtCaseReopenedEvent(
        {
          context: input.context,
          debtCaseId: input.debtCaseId,
          buildingId: doc.buildingId,
          correlationId: input.correlationId,
        },
        session,
      );
    });
  } finally {
    await session.endSession();
  }
}