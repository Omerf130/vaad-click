import "server-only";

import { randomUUID } from "node:crypto";

import mongoose, { Types } from "mongoose";

import type { BuildingLegalReadinessResult } from "@/modules/debt-cases/domain/debt-case-legal-readiness";
import { assertLawyerAdminDebtCaseReview } from "@/modules/debt-cases/services/debt-case-authorization.service";
import { getDebtCase } from "@/modules/debt-cases/services/debt-case.service";
import {
  WarningLetterDraftError,
  WarningLetterDraftErrorCode,
} from "@/modules/warning-letters/domain/warning-letter-draft-errors";
import { WarningLetterFinalDocumentStatus } from "@/modules/warning-letters/domain/warning-letter-final-document-status";
import { WarningLetterDraftStatus } from "@/modules/warning-letters/domain/warning-letter-draft-status";
import { WarningLetterDraft } from "@/modules/warning-letters/infra/warning-letter-draft.model";
import { WarningLetterFinalDocument } from "@/modules/warning-letters/infra/warning-letter-final-document.model";
import { collectWarningLetterFinalizationBlockersHe } from "@/modules/warning-letters/services/warning-letter-finalization-gates";
import {
  loadWarningLetterDraftDetailForApprovedCaseReadOnly,
  mapMongoDraftWriteError,
} from "@/modules/warning-letters/services/warning-letter-draft.service";
import { generateWarningLetterFinalPdf } from "@/modules/warning-letters/services/warning-letter-pdf.service";
import { recordWarningLetterFinalization } from "@/modules/warning-letters/services/warning-letter-lifecycle-audit.service";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import { connectMongo } from "@/shared/db/connect";

export type WarningLetterFinalDocumentView = {
  finalDocumentId: string;
  debtCaseId: string;
  draftId: string;
  draftRevision: number;
  status: string;
  contentSha256: string;
  finalizedAtIso: string;
  operativeBlockReasonsHe: string[];
  pdfAvailable: boolean;
};

export async function loadWarningLetterFinalDocumentForCase(
  debtCaseId: string,
): Promise<WarningLetterFinalDocumentView | null> {
  await connectMongo();
  const doc = await WarningLetterFinalDocument.findOne({ debtCaseId })
    .sort({ finalizedAt: -1 })
    .lean();
  if (!doc) {
    return null;
  }
  return {
    finalDocumentId: doc.finalDocumentId,
    debtCaseId: doc.debtCaseId,
    draftId: doc.draftId,
    draftRevision: doc.draftRevision,
    status: doc.status,
    contentSha256: doc.contentSha256,
    finalizedAtIso: doc.finalizedAt.toISOString(),
    operativeBlockReasonsHe: doc.operativeBlockReasonsHe ?? [],
    pdfAvailable: Boolean(doc.pdfStorageKey),
  };
}

export async function finalizeWarningLetterForDebtCase(input: {
  context: AuthenticatedContext;
  debtCaseId: string;
  draftId: string;
  legalReadiness: BuildingLegalReadinessResult;
  correlationId?: string;
}): Promise<{ created: boolean; finalDocument: WarningLetterFinalDocumentView }> {
  await assertLawyerAdminDebtCaseReview({ context: input.context });
  await connectMongo();

  const debtCase = await getDebtCase({ context: input.context, debtCaseId: input.debtCaseId });
  const detail = await loadWarningLetterDraftDetailForApprovedCaseReadOnly({
    context: input.context,
    debtCaseId: input.debtCaseId,
    debtCaseRecord: debtCase,
  });

  const blockers = collectWarningLetterFinalizationBlockersHe({
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
    throw new WarningLetterDraftError(WarningLetterDraftErrorCode.NOT_FOUND, "Draft mismatch");
  }

  const existing = await WarningLetterFinalDocument.findOne({
    debtCaseId: input.debtCaseId,
    draftId: input.draftId,
    draftRevision: detail.draft.draftRevision,
  }).lean();

  if (existing) {
    return {
      created: false,
      finalDocument: {
        finalDocumentId: existing.finalDocumentId,
        debtCaseId: existing.debtCaseId,
        draftId: existing.draftId,
        draftRevision: existing.draftRevision,
        status: existing.status,
        contentSha256: existing.contentSha256,
        finalizedAtIso: existing.finalizedAt.toISOString(),
        operativeBlockReasonsHe: existing.operativeBlockReasonsHe ?? [],
        pdfAvailable: Boolean(existing.pdfStorageKey),
      },
    };
  }

  const active = await WarningLetterDraft.findOne({
    draftId: input.draftId,
    debtCaseId: input.debtCaseId,
    status: WarningLetterDraftStatus.ACTIVE,
  }).lean();

  if (!active) {
    throw new WarningLetterDraftError(WarningLetterDraftErrorCode.NOT_FOUND, "Active draft missing");
  }

  const pdfResult = await generateWarningLetterFinalPdf({
    snapshot: detail.draft.snapshot,
    contentSha256: detail.draft.contentSha256,
  });

  const operativeBlockReasonsHe = pdfResult.ok ? [] : [pdfResult.reasonHe];
  const status = pdfResult.ok
    ? WarningLetterFinalDocumentStatus.READY_FOR_DELIVERY
    : WarningLetterFinalDocumentStatus.FINALIZED_PENDING_OPERATIVE_PREREQUISITES;

  const finalizedAt = new Date();
  const finalDocumentId = randomUUID();

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await WarningLetterFinalDocument.create(
        [
          {
            finalDocumentId,
            debtCaseId: input.debtCaseId,
            buildingId: detail.draft!.buildingId,
            draftId: detail.draft!.draftId,
            draftRevision: detail.draft!.draftRevision,
            letterCaseReference: detail.draft!.letterCaseReference,
            templateVersionId: detail.draft!.templateVersionId,
            contentSha256: detail.draft!.contentSha256,
            materialInputsSha256: active.materialInputsSha256,
            contentSnapshot: detail.draft!.snapshot,
            status,
            finalizedByUserId: new Types.ObjectId(input.context.user.id),
            finalizedAt,
            operativeBlockReasonsHe,
            pdfContentSha256: pdfResult.ok ? pdfResult.contentSha256 : null,
            pdfStorageKey: pdfResult.ok ? pdfResult.storageKey : null,
          },
        ],
        { session },
      );

      await recordWarningLetterFinalization(
        {
          context: input.context,
          finalDocumentId,
          debtCaseId: input.debtCaseId,
          draftId: detail.draft!.draftId,
          draftRevision: detail.draft!.draftRevision,
          contentSha256: detail.draft!.contentSha256,
          blocked: !pdfResult.ok,
          correlationId: input.correlationId,
        },
        session,
      );
    });
  } catch (error) {
    mapMongoDraftWriteError(error);
    throw error;
  } finally {
    await session.endSession();
  }

  return {
    created: true,
    finalDocument: {
      finalDocumentId,
      debtCaseId: input.debtCaseId,
      draftId: detail.draft.draftId,
      draftRevision: detail.draft.draftRevision,
      status,
      contentSha256: detail.draft.contentSha256,
      finalizedAtIso: finalizedAt.toISOString(),
      operativeBlockReasonsHe,
      pdfAvailable: pdfResult.ok,
    },
  };
}
