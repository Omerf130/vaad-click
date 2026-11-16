import "server-only";

import { randomUUID } from "node:crypto";

import mongoose, { Types } from "mongoose";

import { assertLawyerAdminDebtCaseReview } from "@/modules/debt-cases/services/debt-case-authorization.service";
import { getDebtCase } from "@/modules/debt-cases/services/debt-case.service";
import {
  computeStatementOfClaimDraftContentSha256,
} from "@/modules/statement-of-claim-drafts/domain/statement-of-claim-draft-material-input";
import type { StatementOfClaimDraftContentSnapshot } from "@/modules/statement-of-claim-drafts/domain/statement-of-claim-draft-content-snapshot.types";
import {
  resolveStatementOfClaimSectionDisplayBody,
  resolveStatementOfClaimSectionDisplayTitle,
} from "@/modules/statement-of-claim-drafts/domain/statement-of-claim-draft-content-snapshot.types";
import {
  buildActiveStatementOfClaimDraftEditConcurrencyQuery,
  resolveStatementOfClaimDraftConcurrencyRevision,
  statementOfClaimDraftConcurrencyMatchesExpected,
} from "@/modules/statement-of-claim-drafts/domain/statement-of-claim-draft-concurrency";
import {
  StatementOfClaimDraftError,
  StatementOfClaimDraftErrorCode,
} from "@/modules/statement-of-claim-drafts/domain/statement-of-claim-draft-errors";
import { StatementOfClaimDraftStatus } from "@/modules/statement-of-claim-drafts/domain/statement-of-claim-draft-status";
import {
  sanitizeStatementOfClaimSectionBody,
  sanitizeStatementOfClaimSectionTitle,
} from "@/modules/statement-of-claim-drafts/domain/sanitize-statement-of-claim-section-text";
import { StatementOfClaimDraft } from "@/modules/statement-of-claim-drafts/infra/statement-of-claim-draft.model";
import { recordStatementOfClaimDraftEdited } from "@/modules/statement-of-claim-drafts/services/statement-of-claim-draft-audit.service";
import type { StatementOfClaimTemplateSectionId } from "@/modules/statement-of-claim-templates/domain/statement-of-claim-template-section";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import { connectMongo } from "@/shared/db/connect";

export type StatementOfClaimSectionEditInput = {
  sectionId: StatementOfClaimTemplateSectionId;
  titleHe: string;
  bodyText: string;
};

export type SaveStatementOfClaimDraftEditsInput = {
  context: AuthenticatedContext;
  debtCaseId: string;
  sourceDraftId: string;
  expectedConcurrencyRevision: number;
  sectionEdits: StatementOfClaimSectionEditInput[];
  correlationId?: string;
};

export type SaveStatementOfClaimDraftEditsResult = {
  draftId: string;
  draftRevision: number;
  concurrencyRevision: number;
  unchanged: boolean;
};

function applySectionEdits(
  snapshot: StatementOfClaimDraftContentSnapshot,
  edits: StatementOfClaimSectionEditInput[],
): { next: StatementOfClaimDraftContentSnapshot; editedSectionIds: string[] } {
  const editMap = new Map(edits.map((e) => [e.sectionId, e]));
  const editedSectionIds: string[] = [];
  const sections = snapshot.sections.map((section) => {
    const edit = editMap.get(section.sectionId);
    if (!edit) {
      return section;
    }
    const titleResult = sanitizeStatementOfClaimSectionTitle(edit.titleHe);
    const bodyResult = sanitizeStatementOfClaimSectionBody(edit.bodyText);
    if (!titleResult.ok || !bodyResult.ok) {
      throw new StatementOfClaimDraftError(
        StatementOfClaimDraftErrorCode.UNSAFE_SECTION_TEXT,
        "Invalid section edit",
      );
    }

    const prevTitle = resolveStatementOfClaimSectionDisplayTitle(section);
    const prevBody = resolveStatementOfClaimSectionDisplayBody(section);
    const titleChanged = titleResult.text !== prevTitle;
    const bodyChanged = bodyResult.text !== prevBody;

    if (!titleChanged && !bodyChanged) {
      return section;
    }

    editedSectionIds.push(section.sectionId);
    return {
      ...section,
      titleLawyerOverride: titleResult.text !== section.titleHe ? titleResult.text : null,
      lawyerBodyOverride: bodyResult.text !== section.bodyRendered ? bodyResult.text : null,
    };
  });

  const next: StatementOfClaimDraftContentSnapshot = {
    ...snapshot,
    sections,
    manuallyEdited: true,
    editedSectionIds: [
      ...new Set([...(snapshot.editedSectionIds ?? []), ...editedSectionIds]),
    ],
  };

  return { next, editedSectionIds };
}

export async function saveStatementOfClaimDraftSectionEdits(
  input: SaveStatementOfClaimDraftEditsInput,
): Promise<SaveStatementOfClaimDraftEditsResult> {
  await assertLawyerAdminDebtCaseReview({ context: input.context });
  await connectMongo();
  await getDebtCase({ context: input.context, debtCaseId: input.debtCaseId });

  if (input.sectionEdits.length === 0) {
    throw new StatementOfClaimDraftError(
      StatementOfClaimDraftErrorCode.EDIT_NOT_ALLOWED,
      "No section edits provided",
    );
  }

  const session = await mongoose.startSession();
  try {
    let result: SaveStatementOfClaimDraftEditsResult | null = null;

    await session.withTransaction(async () => {
      const active = await StatementOfClaimDraft.findOne({
        debtCaseId: input.debtCaseId,
        status: StatementOfClaimDraftStatus.ACTIVE,
        draftId: input.sourceDraftId,
      })
        .session(session)
        .lean();

      if (!active) {
        throw new StatementOfClaimDraftError(
          StatementOfClaimDraftErrorCode.NOT_FOUND,
          "Active draft not found",
        );
      }

      if (
        !statementOfClaimDraftConcurrencyMatchesExpected({
          storedRaw: active.concurrencyRevision,
          expected: input.expectedConcurrencyRevision,
        })
      ) {
        throw new StatementOfClaimDraftError(
          StatementOfClaimDraftErrorCode.CONCURRENCY_CONFLICT,
          "Draft was updated in another session",
        );
      }

      const snapshot = active.contentSnapshot as StatementOfClaimDraftContentSnapshot;
      const { next, editedSectionIds } = applySectionEdits(snapshot, input.sectionEdits);

      if (editedSectionIds.length === 0) {
        result = {
          draftId: active.draftId,
          draftRevision: active.draftRevision,
          concurrencyRevision: resolveStatementOfClaimDraftConcurrencyRevision(
            active.concurrencyRevision,
          ),
          unchanged: true,
        };
        return;
      }

      const contentSha256 = computeStatementOfClaimDraftContentSha256(next);

      const superseded = await StatementOfClaimDraft.findOneAndUpdate(
        {
          draftId: active.draftId,
          status: StatementOfClaimDraftStatus.ACTIVE,
          ...buildActiveStatementOfClaimDraftEditConcurrencyQuery(
            input.expectedConcurrencyRevision,
          ),
        },
        {
          $set: {
            status: StatementOfClaimDraftStatus.SUPERSEDED,
            supersededAt: new Date(),
            updatedByUserId: new Types.ObjectId(input.context.user.id),
          },
        },
        { session, returnDocument: "after" },
      ).lean();

      if (!superseded) {
        throw new StatementOfClaimDraftError(
          StatementOfClaimDraftErrorCode.CONCURRENCY_CONFLICT,
          "Concurrency conflict on supersede",
        );
      }

      const draftId = randomUUID();
      const draftRevision = active.draftRevision + 1;
      const userId = new Types.ObjectId(input.context.user.id);

      await StatementOfClaimDraft.create(
        [
          {
            draftId,
            debtCaseId: active.debtCaseId,
            buildingId: active.buildingId,
            templateRevisionId: active.templateRevisionId,
            draftRevision,
            priorDraftId: active.draftId,
            operativeStatus: active.operativeStatus,
            contentSnapshot: next,
            contentSha256,
            materialInputsSha256: active.materialInputsSha256,
            status: StatementOfClaimDraftStatus.ACTIVE,
            concurrencyRevision: resolveStatementOfClaimDraftConcurrencyRevision(
              active.concurrencyRevision,
            ) + 1,
            manuallyEdited: true,
            editedSectionIds: next.editedSectionIds ?? editedSectionIds,
            createdByUserId: userId,
            updatedByUserId: userId,
          },
        ],
        { session },
      );

      await recordStatementOfClaimDraftEdited({
        context: input.context,
        draftId,
        debtCaseId: active.debtCaseId,
        buildingId: active.buildingId,
        draftRevision,
        templateRevisionId: active.templateRevisionId,
        contentSha256,
        materialInputsSha256: active.materialInputsSha256,
        priorDraftId: active.draftId,
        editedSectionIds,
        correlationId: input.correlationId,
        session,
      });

      result = {
        draftId,
        draftRevision,
        concurrencyRevision:
          resolveStatementOfClaimDraftConcurrencyRevision(active.concurrencyRevision) + 1,
        unchanged: false,
      };
    });

    if (!result) {
      throw new StatementOfClaimDraftError(
        StatementOfClaimDraftErrorCode.NOT_FOUND,
        "Edit transaction did not complete",
      );
    }

    return result;
  } finally {
    await session.endSession();
  }
}