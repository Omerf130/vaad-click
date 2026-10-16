import "server-only";

import mongoose, { Types } from "mongoose";

import type { BuildingLegalReadinessResult } from "@/modules/debt-cases/domain/debt-case-legal-readiness";
import { DebtCaseLawyerReviewStatus } from "@/modules/debt-cases/domain/debt-case-lawyer-review-status";
import { assertLawyerAdminDebtCaseReview } from "@/modules/debt-cases/services/debt-case-authorization.service";
import { getDebtCase } from "@/modules/debt-cases/services/debt-case.service";
import {
  WarningLetterDraftError,
  WarningLetterDraftErrorCode,
} from "@/modules/warning-letters/domain/warning-letter-draft-errors";
import { WarningLetterDraftLegalApprovalStatus } from "@/modules/warning-letters/domain/warning-letter-draft-legal-approval-status";
import { WarningLetterDraftStatus } from "@/modules/warning-letters/domain/warning-letter-draft-status";
import { WarningLetterType } from "@/modules/warning-letters/domain/warning-letter-type";
import { WarningLetterDraft } from "@/modules/warning-letters/infra/warning-letter-draft.model";
import {
  recordWarningLetterDraftWordingApproved,
  recordWarningLetterDraftWordingReturned,
} from "@/modules/warning-letters/services/warning-letter-draft-audit.service";
import { collectWarningLetterWordingApprovalBlockersHe } from "@/modules/warning-letters/services/warning-letter-draft-approval-gates";
import {
  loadWarningLetterDraftDetailForApprovedCaseReadOnly,
  mapMongoDraftWriteError,
} from "@/modules/warning-letters/services/warning-letter-draft.service";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import { connectMongo } from "@/shared/db/connect";

export async function approveWarningLetterDraftWording(input: {
  context: AuthenticatedContext;
  debtCaseId: string;
  draftId: string;
  manualOverrideAcknowledged: boolean;
  legalReadiness: BuildingLegalReadinessResult;
  correlationId?: string;
}): Promise<void> {
  await assertLawyerAdminDebtCaseReview({ context: input.context });
  await connectMongo();

  const debtCase = await getDebtCase({ context: input.context, debtCaseId: input.debtCaseId });
  if (debtCase.lawyerReviewStatus !== DebtCaseLawyerReviewStatus.APPROVED_FOR_LETTER_PREP) {
    throw new WarningLetterDraftError(
      WarningLetterDraftErrorCode.CASE_NOT_APPROVED_FOR_LETTER_PREP,
      "Debt case is not approved for letter preparation",
    );
  }

  const detail = await loadWarningLetterDraftDetailForApprovedCaseReadOnly({
    context: input.context,
    debtCaseId: input.debtCaseId,
    debtCaseRecord: debtCase,
  });

  const blockers = collectWarningLetterWordingApprovalBlockersHe({
    debtCase,
    legalReadiness: input.legalReadiness,
    loadState: detail.loadState,
    draft: detail.draft,
    legalWordingApprovalStatus: detail.legalWordingApprovalStatus,
  });

  if (blockers.length > 0) {
    throw new WarningLetterDraftError(
      WarningLetterDraftErrorCode.APPROVAL_BLOCKED,
      blockers.join(" | "),
    );
  }

  if (!detail.draft || detail.draft.draftId !== input.draftId) {
    throw new WarningLetterDraftError(
      WarningLetterDraftErrorCode.NOT_FOUND,
      "Draft mismatch for approval",
    );
  }

  if (detail.draft.manuallyEdited && !input.manualOverrideAcknowledged) {
    throw new WarningLetterDraftError(
      WarningLetterDraftErrorCode.APPROVAL_BLOCKED,
      "Manual override acknowledgment required",
    );
  }

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const updated = await WarningLetterDraft.findOneAndUpdate(
        {
          draftId: input.draftId,
          debtCaseId: input.debtCaseId,
          status: WarningLetterDraftStatus.ACTIVE,
          legalWordingApprovalStatus: WarningLetterDraftLegalApprovalStatus.NONE,
        },
        {
          $set: {
            legalWordingApprovalStatus: WarningLetterDraftLegalApprovalStatus.APPROVED,
            legalWordingApprovedAt: new Date(),
            legalWordingApprovedByUserId: new Types.ObjectId(input.context.user.id),
            legalWordingApprovedContentSha256: detail.draft!.contentSha256,
            legalWordingReturnReason: null,
            legalWordingReturnedAt: null,
            updatedByUserId: new Types.ObjectId(input.context.user.id),
          },
        },
        { session, returnDocument: "after" },
      ).lean();

      if (!updated) {
        throw new WarningLetterDraftError(
          WarningLetterDraftErrorCode.APPROVAL_BLOCKED,
          "Draft could not be approved",
        );
      }

      await recordWarningLetterDraftWordingApproved({
        context: input.context,
        draftId: updated.draftId,
        debtCaseId: updated.debtCaseId,
        buildingId: updated.buildingId,
        letterType: updated.letterType as WarningLetterType,
        draftRevision: updated.draftRevision,
        letterCaseReference: updated.letterCaseReference,
        templateVersionId: updated.templateVersionId,
        contentSha256: updated.contentSha256,
        approvalReady: updated.approvalReady,
        correlationId: input.correlationId,
        session,
        manualOverrideAcknowledged: input.manualOverrideAcknowledged,
        manuallyEdited: Boolean(updated.manuallyEdited),
      });
    });
  } catch (error) {
    if (error instanceof WarningLetterDraftError) {
      throw error;
    }
    mapMongoDraftWriteError(error);
  } finally {
    await session.endSession();
  }
}

export async function returnWarningLetterDraftForCorrection(input: {
  context: AuthenticatedContext;
  debtCaseId: string;
  draftId: string;
  returnReason: string;
  correlationId?: string;
}): Promise<void> {
  await assertLawyerAdminDebtCaseReview({ context: input.context });
  await connectMongo();

  const reason = input.returnReason.trim();
  if (reason.length < 3) {
    throw new WarningLetterDraftError(
      WarningLetterDraftErrorCode.RETURN_REASON_REQUIRED,
      "Return reason is required",
    );
  }

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const active = await WarningLetterDraft.findOne({
        draftId: input.draftId,
        debtCaseId: input.debtCaseId,
        letterType: WarningLetterType.INITIAL_WARNING,
        status: WarningLetterDraftStatus.ACTIVE,
        legalWordingApprovalStatus: WarningLetterDraftLegalApprovalStatus.APPROVED,
      })
        .session(session)
        .lean();

      if (!active) {
        throw new WarningLetterDraftError(
          WarningLetterDraftErrorCode.APPROVAL_BLOCKED,
          "Only an approved active draft can be returned for correction",
        );
      }

      await WarningLetterDraft.updateOne(
        { draftId: active.draftId },
        {
          $set: {
            legalWordingApprovalStatus:
              WarningLetterDraftLegalApprovalStatus.RETURNED_FOR_CORRECTION,
            legalWordingReturnReason: reason,
            legalWordingReturnedAt: new Date(),
            updatedByUserId: new Types.ObjectId(input.context.user.id),
          },
        },
        { session },
      );

      await recordWarningLetterDraftWordingReturned({
        context: input.context,
        draftId: active.draftId,
        debtCaseId: active.debtCaseId,
        buildingId: active.buildingId,
        letterType: active.letterType as WarningLetterType,
        draftRevision: active.draftRevision,
        letterCaseReference: active.letterCaseReference,
        templateVersionId: active.templateVersionId,
        contentSha256: active.contentSha256,
        approvalReady: active.approvalReady,
        correlationId: input.correlationId,
        session,
        returnReason: reason,
      });
    });
  } catch (error) {
    if (error instanceof WarningLetterDraftError) {
      throw error;
    }
    mapMongoDraftWriteError(error);
  } finally {
    await session.endSession();
  }
}

export async function listWarningLetterDraftRevisionHistory(input: {
  context: AuthenticatedContext;
  debtCaseId: string;
}): Promise<
  Array<{
    draftId: string;
    draftRevision: number;
    status: WarningLetterDraftStatus;
    legalWordingApprovalStatus: WarningLetterDraftLegalApprovalStatus;
    manuallyEdited: boolean;
    createdAtIso: string;
    contentSha256Prefix: string;
  }>
> {
  await assertLawyerAdminDebtCaseReview({ context: input.context });
  await connectMongo();

  const rows = await WarningLetterDraft.find({
    debtCaseId: input.debtCaseId,
    letterType: WarningLetterType.INITIAL_WARNING,
  })
    .sort({ draftRevision: -1 })
    .limit(25)
    .select(
      "draftId draftRevision status legalWordingApprovalStatus manuallyEdited createdAt contentSha256",
    )
    .lean();

  return rows.map((row) => ({
    draftId: row.draftId,
    draftRevision: row.draftRevision,
    status: row.status as WarningLetterDraftStatus,
    legalWordingApprovalStatus:
      row.legalWordingApprovalStatus as WarningLetterDraftLegalApprovalStatus,
    manuallyEdited: Boolean(row.manuallyEdited),
    createdAtIso: row.createdAt?.toISOString() ?? new Date().toISOString(),
    contentSha256Prefix: row.contentSha256.slice(0, 12),
  }));
}
