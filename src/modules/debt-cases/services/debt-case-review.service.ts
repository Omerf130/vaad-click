import "server-only";

import mongoose, { Types } from "mongoose";

import { DebtCaseError, DebtCaseErrorCode } from "@/modules/debt-cases/domain/debt-case-errors";
import {
  assertDebtCaseLawyerReviewTransition,
  assertDebtCaseWorkflowTransition,
  lawyerReviewStatusAfterLawyerApprove,
} from "@/modules/debt-cases/domain/debt-case-status-transitions";
import { DebtCaseLawyerReviewStatus } from "@/modules/debt-cases/domain/debt-case-lawyer-review-status";
import { DebtCaseWorkflowStatus } from "@/modules/debt-cases/domain/debt-case-workflow-status";
import { DebtCase } from "@/modules/debt-cases/infra/debt-case.model";
import { mapDebtCaseDocumentToListItem } from "@/modules/debt-cases/persistence/debt-case.mapper";
import type { DebtCaseListItem } from "@/modules/debt-cases/persistence/debt-case.mapper";
import { assertLawyerAdminDebtCaseReview } from "@/modules/debt-cases/services/debt-case-authorization.service";
import {
  recordDebtCaseApprovedForLetterPrep,
  recordDebtCaseRejected,
  recordDebtCaseReturned,
} from "@/modules/debt-cases/services/debt-case-audit.service";
import { loadBuildingLegalReadinessForDebtCase } from "@/modules/debt-cases/services/debt-case-legal-readiness.loader";
import { syncInitialWarningLetterDraftForApprovedCase } from "@/modules/warning-letters/services/warning-letter-draft.service";
import { releaseClaimsForTerminalCase } from "@/modules/debt-cases/services/debt-case-period-claim.service";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import { AuditWriteFailedError } from "@/shared/audit/errors/audit-errors";
import { connectMongo } from "@/shared/db/connect";

function mapAuditPersistenceError(error: unknown): never {
  if (error instanceof AuditWriteFailedError) {
    throw new DebtCaseError(
      DebtCaseErrorCode.AUDIT_PERSISTENCE,
      "Debt case review action could not be recorded",
    );
  }
  throw error;
}

async function loadCase(debtCaseId: string) {
  await connectMongo();
  const doc = await DebtCase.findOne({ debtCaseId });
  if (!doc) {
    throw new DebtCaseError(DebtCaseErrorCode.NOT_FOUND, "Debt case not found");
  }
  return doc;
}

export async function listLawyerReviewQueue(input: {
  context: AuthenticatedContext;
}): Promise<DebtCaseListItem[]> {
  await assertLawyerAdminDebtCaseReview({ context: input.context });
  await connectMongo();
  const rows = await DebtCase.find({
    lawyerReviewStatus: DebtCaseLawyerReviewStatus.PENDING,
    workflowStatus: DebtCaseWorkflowStatus.AWAITING_LAWYER_REVIEW,
  })
    .sort({ submittedAt: 1 })
    .limit(500);
  return rows.map((row) => mapDebtCaseDocumentToListItem(row));
}

function assertReviewComment(comment: string | undefined, required: boolean): string {
  const trimmed = (comment ?? "").trim();
  if (!required && !trimmed) {
    return "";
  }
  if (trimmed.length < 3) {
    throw new DebtCaseError(DebtCaseErrorCode.VALIDATION, "Review comment required");
  }
  if (trimmed.length > 500) {
    throw new DebtCaseError(DebtCaseErrorCode.VALIDATION, "Review comment too long");
  }
  return trimmed;
}

export async function returnDebtCaseForCompletion(input: {
  context: AuthenticatedContext;
  debtCaseId: string;
  expectedRevision: number;
  reviewCommentHe?: string;
  correlationId?: string;
}): Promise<void> {
  await assertLawyerAdminDebtCaseReview({ context: input.context });
  const doc = await loadCase(input.debtCaseId);

  assertDebtCaseWorkflowTransition({
    from: doc.workflowStatus as DebtCaseWorkflowStatus,
    to: DebtCaseWorkflowStatus.RETURNED_FOR_COMPLETION,
    context: {
      role: input.context.user.role,
      accountStatus: input.context.user.accountStatus,
    },
  });
  assertDebtCaseLawyerReviewTransition(
    doc.lawyerReviewStatus as DebtCaseLawyerReviewStatus,
    DebtCaseLawyerReviewStatus.RETURNED,
  );

  const reviewCommentHe = assertReviewComment(input.reviewCommentHe, true);

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const updated = await DebtCase.findOneAndUpdate(
        { debtCaseId: input.debtCaseId, revision: input.expectedRevision },
        {
          $set: {
            workflowStatus: DebtCaseWorkflowStatus.RETURNED_FOR_COMPLETION,
            lawyerReviewStatus: DebtCaseLawyerReviewStatus.RETURNED,
            updatedByUserId: new Types.ObjectId(input.context.user.id),
          },
          $inc: { revision: 1 },
        },
        { session, new: true },
      );
      if (!updated) {
        throw new DebtCaseError(DebtCaseErrorCode.REVISION_CONFLICT, "Stale revision");
      }

      await recordDebtCaseReturned({
        context: input.context,
        debtCaseId: doc.debtCaseId,
        buildingId: doc.buildingId,
        revision: updated.revision,
        lawyerReviewStatus: DebtCaseLawyerReviewStatus.RETURNED,
        reviewCommentHe,
        correlationId: input.correlationId,
        session,
      });
    });
  } catch (error) {
    if (error instanceof DebtCaseError) {
      throw error;
    }
    mapAuditPersistenceError(error);
  } finally {
    await session.endSession();
  }
}

export async function rejectDebtCase(input: {
  context: AuthenticatedContext;
  debtCaseId: string;
  expectedRevision: number;
  reviewCommentHe: string;
  correlationId?: string;
}): Promise<void> {
  await assertLawyerAdminDebtCaseReview({ context: input.context });
  const doc = await loadCase(input.debtCaseId);

  assertDebtCaseWorkflowTransition({
    from: doc.workflowStatus as DebtCaseWorkflowStatus,
    to: DebtCaseWorkflowStatus.REJECTED,
    context: {
      role: input.context.user.role,
      accountStatus: input.context.user.accountStatus,
    },
  });
  assertDebtCaseLawyerReviewTransition(
    doc.lawyerReviewStatus as DebtCaseLawyerReviewStatus,
    DebtCaseLawyerReviewStatus.REJECTED,
  );

  const reviewCommentHe = assertReviewComment(input.reviewCommentHe, true);

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const updated = await DebtCase.findOneAndUpdate(
        { debtCaseId: input.debtCaseId, revision: input.expectedRevision },
        {
          $set: {
            workflowStatus: DebtCaseWorkflowStatus.REJECTED,
            lawyerReviewStatus: DebtCaseLawyerReviewStatus.REJECTED,
            updatedByUserId: new Types.ObjectId(input.context.user.id),
          },
          $inc: { revision: 1 },
        },
        { session, new: true },
      );
      if (!updated) {
        throw new DebtCaseError(DebtCaseErrorCode.REVISION_CONFLICT, "Stale revision");
      }

      await releaseClaimsForTerminalCase({
        debtCaseId: doc.debtCaseId,
        workflowStatus: DebtCaseWorkflowStatus.REJECTED,
        session,
      });

      await recordDebtCaseRejected({
        context: input.context,
        debtCaseId: doc.debtCaseId,
        buildingId: doc.buildingId,
        revision: updated.revision,
        lawyerReviewStatus: DebtCaseLawyerReviewStatus.REJECTED,
        reviewCommentHe,
        correlationId: input.correlationId,
        session,
      });
    });
  } catch (error) {
    if (error instanceof DebtCaseError) {
      throw error;
    }
    mapAuditPersistenceError(error);
  } finally {
    await session.endSession();
  }
}

export async function approveDebtCaseForLetterPrep(input: {
  context: AuthenticatedContext;
  debtCaseId: string;
  expectedRevision: number;
  correlationId?: string;
}): Promise<void> {
  await assertLawyerAdminDebtCaseReview({ context: input.context });
  const doc = await loadCase(input.debtCaseId);

  const nextReview = lawyerReviewStatusAfterLawyerApprove();
  assertDebtCaseLawyerReviewTransition(
    doc.lawyerReviewStatus as DebtCaseLawyerReviewStatus,
    nextReview,
  );

  const readiness = await loadBuildingLegalReadinessForDebtCase(doc.buildingId);

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const updated = await DebtCase.findOneAndUpdate(
        { debtCaseId: input.debtCaseId, revision: input.expectedRevision },
        {
          $set: {
            lawyerReviewStatus: nextReview,
            legalHoldReasons: readiness.legalTreatmentAllowed ? [] : readiness.holdReasons,
            updatedByUserId: new Types.ObjectId(input.context.user.id),
          },
          $inc: { revision: 1 },
        },
        { session, new: true },
      );
      if (!updated) {
        throw new DebtCaseError(DebtCaseErrorCode.REVISION_CONFLICT, "Stale revision");
      }

      await recordDebtCaseApprovedForLetterPrep({
        context: input.context,
        debtCaseId: doc.debtCaseId,
        buildingId: doc.buildingId,
        revision: updated.revision,
        lawyerReviewStatus: nextReview,
        validationFlagCodes: (doc.validationFlags ?? []).map(
          (f: { code: import("@/modules/debt-cases/domain/debt-case-validation-flag").DebtCaseValidationFlagCode }) =>
            f.code,
        ),
        correlationId: input.correlationId,
        session,
      });

      await syncInitialWarningLetterDraftForApprovedCase({
        context: input.context,
        debtCaseId: doc.debtCaseId,
        session,
        correlationId: input.correlationId,
      });
    });
  } catch (error) {
    if (error instanceof DebtCaseError) {
      throw error;
    }
    mapAuditPersistenceError(error);
  } finally {
    await session.endSession();
  }
}
