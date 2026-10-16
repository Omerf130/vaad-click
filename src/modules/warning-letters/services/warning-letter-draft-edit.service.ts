import "server-only";

import { randomUUID } from "node:crypto";

import mongoose, { Types } from "mongoose";

import { assertLawyerAdminDebtCaseReview } from "@/modules/debt-cases/services/debt-case-authorization.service";
import { getDebtCase } from "@/modules/debt-cases/services/debt-case.service";
import { DebtCaseLawyerReviewStatus } from "@/modules/debt-cases/domain/debt-case-lawyer-review-status";
import { sanitizeLawyerClauseOverrideText } from "@/modules/warning-letters/domain/sanitize-lawyer-clause-text";
import {
  WarningLetterDraftError,
  WarningLetterDraftErrorCode,
} from "@/modules/warning-letters/domain/warning-letter-draft-errors";
import { WarningLetterDraftLegalApprovalStatus } from "@/modules/warning-letters/domain/warning-letter-draft-legal-approval-status";
import { WarningLetterDraftStatus } from "@/modules/warning-letters/domain/warning-letter-draft-status";
import { WarningLetterType } from "@/modules/warning-letters/domain/warning-letter-type";
import {
  isLawyerEditableClauseId,
  type WarningLetterLawyerEditableClauseId,
} from "@/modules/warning-letters/domain/warning-letter-editable-clause";
import { WarningLetterDraft } from "@/modules/warning-letters/infra/warning-letter-draft.model";
import {
  buildActiveDraftEditConcurrencyQuery,
  resolveWarningLetterDraftConcurrencyRevision,
  warningLetterDraftConcurrencyMatchesExpected,
} from "@/modules/warning-letters/domain/warning-letter-draft-concurrency";
import { pickChangedClauseOverrides } from "@/modules/warning-letters/domain/pick-changed-clause-overrides";
import { applyManualClauseOverridesToSnapshot } from "@/modules/warning-letters/snapshot/apply-clause-overrides-to-snapshot";
import { recordWarningLetterDraftEdited } from "@/modules/warning-letters/services/warning-letter-draft-audit.service";
import {
  loadWarningLetterDraftDetailForApprovedCaseReadOnly,
  mapMongoDraftWriteError,
} from "@/modules/warning-letters/services/warning-letter-draft.service";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import { connectMongo } from "@/shared/db/connect";

export type SaveWarningLetterDraftEditsInput = {
  context: AuthenticatedContext;
  debtCaseId: string;
  sourceDraftId: string;
  expectedConcurrencyRevision: number;
  clauseOverrides: Partial<Record<WarningLetterLawyerEditableClauseId, string>>;
  correlationId?: string;
};

function overridesMapFromRecord(
  overrides: Partial<Record<WarningLetterLawyerEditableClauseId, string>>,
): Map<string, string> {
  const map = new Map<string, string>();
  for (const [key, value] of Object.entries(overrides)) {
    if (value != null) {
      map.set(key, value);
    }
  }
  return map;
}

export type SaveWarningLetterDraftEditsResult = {
  draftId: string;
  draftRevision: number;
  concurrencyRevision: number;
  unchanged: boolean;
};

export async function saveWarningLetterDraftClauseEdits(
  input: SaveWarningLetterDraftEditsInput,
): Promise<SaveWarningLetterDraftEditsResult> {
  await assertLawyerAdminDebtCaseReview({ context: input.context });
  await connectMongo();

  const debtCase = await getDebtCase({ context: input.context, debtCaseId: input.debtCaseId });
  if (debtCase.lawyerReviewStatus !== DebtCaseLawyerReviewStatus.APPROVED_FOR_LETTER_PREP) {
    throw new WarningLetterDraftError(
      WarningLetterDraftErrorCode.CASE_NOT_APPROVED_FOR_LETTER_PREP,
      "Debt case is not approved for letter preparation",
    );
  }

  const sanitized: Partial<Record<WarningLetterLawyerEditableClauseId, string>> = {};
  for (const [clauseId, raw] of Object.entries(input.clauseOverrides)) {
    if (!isLawyerEditableClauseId(clauseId)) {
      throw new WarningLetterDraftError(
        WarningLetterDraftErrorCode.EDIT_NOT_ALLOWED,
        "Clause is not editable",
      );
    }
    const result = sanitizeLawyerClauseOverrideText(String(raw ?? ""));
    if (!result.ok) {
      throw new WarningLetterDraftError(
        WarningLetterDraftErrorCode.UNSAFE_CLAUSE_TEXT,
        `Invalid clause text: ${result.reason}`,
      );
    }
    sanitized[clauseId] = result.text;
  }

  if (Object.keys(sanitized).length === 0) {
    throw new WarningLetterDraftError(
      WarningLetterDraftErrorCode.EDIT_NOT_ALLOWED,
      "No clause edits provided",
    );
  }

  const activePreview = await WarningLetterDraft.findOne({
    debtCaseId: input.debtCaseId,
    letterType: WarningLetterType.INITIAL_WARNING,
    status: WarningLetterDraftStatus.ACTIVE,
    draftId: input.sourceDraftId,
  }).lean();

  if (!activePreview) {
    throw new WarningLetterDraftError(
      WarningLetterDraftErrorCode.NOT_FOUND,
      "Active draft not found for edit",
    );
  }

  const changedOverrides = pickChangedClauseOverrides({
    snapshot: activePreview.contentSnapshot,
    overrides: sanitized,
  });
  const editedClauseIds = Object.keys(changedOverrides);
  if (editedClauseIds.length === 0) {
    return {
      draftId: activePreview.draftId,
      draftRevision: activePreview.draftRevision,
      concurrencyRevision: resolveWarningLetterDraftConcurrencyRevision(
        activePreview.concurrencyRevision,
      ),
      unchanged: true,
    };
  }

  const session = await mongoose.startSession();
  try {
    let createdDraftId = "";
    let createdRevision = 0;

    await session.withTransaction(async () => {
      const active = await WarningLetterDraft.findOne({
        debtCaseId: input.debtCaseId,
        letterType: WarningLetterType.INITIAL_WARNING,
        status: WarningLetterDraftStatus.ACTIVE,
        draftId: input.sourceDraftId,
      })
        .session(session)
        .lean();

      if (!active) {
        throw new WarningLetterDraftError(
          WarningLetterDraftErrorCode.NOT_FOUND,
          "Active draft not found for edit",
        );
      }

      if (
        !warningLetterDraftConcurrencyMatchesExpected({
          storedRaw: active.concurrencyRevision,
          expected: input.expectedConcurrencyRevision,
        })
      ) {
        throw new WarningLetterDraftError(
          WarningLetterDraftErrorCode.CONCURRENCY_CONFLICT,
          "Draft was updated in another session",
        );
      }

      if (
        active.legalWordingApprovalStatus === WarningLetterDraftLegalApprovalStatus.APPROVED
      ) {
        throw new WarningLetterDraftError(
          WarningLetterDraftErrorCode.DRAFT_LEGALLY_APPROVED,
          "Approved draft cannot be edited in place",
        );
      }

      const updatedSnapshot = applyManualClauseOverridesToSnapshot({
        snapshot: active.contentSnapshot,
        overrides: changedOverrides,
      });

      const superseded = await WarningLetterDraft.findOneAndUpdate(
        {
          draftId: active.draftId,
          status: WarningLetterDraftStatus.ACTIVE,
          ...buildActiveDraftEditConcurrencyQuery(input.expectedConcurrencyRevision),
        },
        {
          $set: {
            status: WarningLetterDraftStatus.SUPERSEDED,
            updatedByUserId: new Types.ObjectId(input.context.user.id),
          },
        },
        { session, returnDocument: "after" },
      ).lean();

      if (!superseded) {
        throw new WarningLetterDraftError(
          WarningLetterDraftErrorCode.CONCURRENCY_CONFLICT,
          "Draft concurrency conflict on supersede",
        );
      }

      const draftId = randomUUID();
      const draftRevision = active.draftRevision + 1;
      const userId = new Types.ObjectId(input.context.user.id);

      await WarningLetterDraft.create(
        [
          {
            draftId,
            debtCaseId: active.debtCaseId,
            buildingId: active.buildingId,
            letterType: active.letterType,
            templateVersionId: active.templateVersionId,
            draftRevision,
            priorDraftId: active.draftId,
            letterCaseReference: active.letterCaseReference,
            status: WarningLetterDraftStatus.ACTIVE,
            contentSnapshot: updatedSnapshot,
            contentSha256: updatedSnapshot.contentSha256,
            materialInputsSha256: active.materialInputsSha256,
            unapprovedTemplateVariantIds: active.unapprovedTemplateVariantIds,
            approvalReady: active.approvalReady,
            invalidationReason: null,
            invalidatedAt: null,
            manuallyEdited: true,
            manualClauseOverrides: overridesMapFromRecord(changedOverrides),
            editedClauseIds,
            concurrencyRevision: 1,
            legalWordingApprovalStatus: WarningLetterDraftLegalApprovalStatus.NONE,
            legalWordingApprovedAt: null,
            legalWordingApprovedByUserId: null,
            legalWordingApprovedContentSha256: null,
            legalWordingReturnReason: null,
            legalWordingReturnedAt: null,
            createdByUserId: userId,
            updatedByUserId: userId,
          },
        ],
        { session },
      );

      await recordWarningLetterDraftEdited({
        context: input.context,
        draftId,
        debtCaseId: active.debtCaseId,
        buildingId: active.buildingId,
        letterType: active.letterType,
        draftRevision,
        letterCaseReference: active.letterCaseReference,
        templateVersionId: active.templateVersionId,
        contentSha256: updatedSnapshot.contentSha256,
        approvalReady: active.approvalReady,
        correlationId: input.correlationId,
        session,
        priorDraftId: active.draftId,
        editedClauseIds,
        manuallyEdited: true,
      });

      createdDraftId = draftId;
      createdRevision = draftRevision;
    });

    const detail = await loadWarningLetterDraftDetailForApprovedCaseReadOnly({
      context: input.context,
      debtCaseId: input.debtCaseId,
      debtCaseRecord: debtCase,
    });

    return {
      draftId: createdDraftId,
      draftRevision: createdRevision,
      concurrencyRevision: detail.draft?.concurrencyRevision ?? 1,
      unchanged: false,
    };
  } catch (error) {
    if (error instanceof WarningLetterDraftError) {
      throw error;
    }
    mapMongoDraftWriteError(error);
  } finally {
    await session.endSession();
  }

  throw new WarningLetterDraftError(
    WarningLetterDraftErrorCode.NOT_FOUND,
    "Edit transaction did not complete",
  );
}
