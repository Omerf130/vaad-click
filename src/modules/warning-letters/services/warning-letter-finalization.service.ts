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
import { WARNING_LETTER_MANUAL_FINAL_PDF_ARCHIVAL_NOTE_HE } from "@/modules/warning-letters/domain/warning-letter-operative-deadline-policy";
import { applyFinalizationLetterDatesToSnapshot } from "@/modules/warning-letters/snapshot/apply-finalization-letter-dates";
import type { WarningLetterContentSnapshot } from "@/modules/warning-letters/snapshot/warning-letter-snapshot.types";
import { collectWarningLetterFinalizationBlockersHe } from "@/modules/warning-letters/services/warning-letter-finalization-gates";
import {
  loadWarningLetterDraftDetailForApprovedCaseReadOnly,
  mapMongoDraftWriteError,
} from "@/modules/warning-letters/services/warning-letter-draft.service";
import { generateWarningLetterFinalPdf } from "@/modules/warning-letters/services/warning-letter-pdf.service";
import { isOperativeDeadlinePolicyConfirmed } from "@/modules/warning-letters/services/warning-letter-operative-deadline-policy.service";
import { recordWarningLetterFinalization } from "@/modules/warning-letters/services/warning-letter-lifecycle-audit.service";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import { connectMongo } from "@/shared/db/connect";
import { todayJerusalemIso } from "@/shared/time/jerusalem-calendar";

export type WarningLetterFinalDocumentView = {
  finalDocumentId: string;
  debtCaseId: string;
  draftId: string;
  draftRevision: number;
  status: string;
  contentSha256: string;
  materialInputsSha256: string;
  letterCaseReference: string;
  contentSnapshot: WarningLetterContentSnapshot;
  finalizedAtIso: string;
  operativeBlockReasonsHe: string[];
  pdfAvailable: boolean;
  letterDateIso: string | null;
  printedDeadlineDateIso: string | null;
  pdfArchivalNoteHe: string;
};

type FinalDocumentLean = {
  finalDocumentId: string;
  debtCaseId: string;
  draftId: string;
  draftRevision: number;
  status: string;
  contentSha256: string;
  materialInputsSha256: string;
  letterCaseReference: string;
  finalizedAt: Date;
  operativeBlockReasonsHe?: string[];
  pdfStorageKey?: string | null;
  contentSnapshot: unknown;
};

function mapFinalDocumentView(doc: FinalDocumentLean): WarningLetterFinalDocumentView {
  const snapshot = doc.contentSnapshot as WarningLetterContentSnapshot;
  const pdfReady = doc.status === WarningLetterFinalDocumentStatus.READY_FOR_DELIVERY;
  return {
    finalDocumentId: doc.finalDocumentId,
    debtCaseId: doc.debtCaseId,
    draftId: doc.draftId,
    draftRevision: doc.draftRevision,
    status: doc.status,
    contentSha256: doc.contentSha256,
    materialInputsSha256: doc.materialInputsSha256,
    letterCaseReference: doc.letterCaseReference,
    contentSnapshot: snapshot,
    finalizedAtIso: doc.finalizedAt.toISOString(),
    operativeBlockReasonsHe: doc.operativeBlockReasonsHe ?? [],
    pdfAvailable: pdfReady,
    letterDateIso: snapshot?.letterDateIso ?? null,
    printedDeadlineDateIso: snapshot?.printedDeadlineDateIso ?? null,
    pdfArchivalNoteHe: WARNING_LETTER_MANUAL_FINAL_PDF_ARCHIVAL_NOTE_HE,
  };
}

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
  return mapFinalDocumentView(doc as FinalDocumentLean);
}

export async function loadWarningLetterFinalDocumentById(input: {
  debtCaseId: string;
  finalDocumentId: string;
}): Promise<(WarningLetterFinalDocumentView & { snapshot: WarningLetterContentSnapshot }) | null> {
  await connectMongo();
  const doc = await WarningLetterFinalDocument.findOne({
    debtCaseId: input.debtCaseId,
    finalDocumentId: input.finalDocumentId,
  }).lean();
  if (!doc?.contentSnapshot) {
    return null;
  }
  return {
    ...mapFinalDocumentView(doc as FinalDocumentLean),
    snapshot: doc.contentSnapshot as WarningLetterContentSnapshot,
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

  const operativeDeadlinePolicyConfirmed = await isOperativeDeadlinePolicyConfirmed();
  const letterDateIso = todayJerusalemIso();
  const operativeSnapshotForFinalize = detail.draft
    ? applyFinalizationLetterDatesToSnapshot(detail.draft.snapshot, letterDateIso)
    : null;

  const blockers = collectWarningLetterFinalizationBlockersHe({
    debtCase,
    legalReadiness: input.legalReadiness,
    loadState: detail.loadState,
    draft: detail.draft,
    legalWordingApprovalStatus: detail.legalWordingApprovalStatus,
    operativeDeadlinePolicyConfirmed,
    operativeSnapshotForFinalize,
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
      finalDocument: mapFinalDocumentView(existing as FinalDocumentLean),
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

  if (!operativeSnapshotForFinalize) {
    throw new WarningLetterDraftError(WarningLetterDraftErrorCode.NOT_FOUND, "Draft snapshot missing");
  }

  const pdfResult = await generateWarningLetterFinalPdf({
    snapshot: operativeSnapshotForFinalize,
    contentSha256: operativeSnapshotForFinalize.contentSha256,
    draftRevision: detail.draft.draftRevision,
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
            contentSha256: operativeSnapshotForFinalize.contentSha256,
            materialInputsSha256: active.materialInputsSha256,
            contentSnapshot: operativeSnapshotForFinalize,
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
          contentSha256: operativeSnapshotForFinalize.contentSha256,
          blocked: !pdfResult.ok,
          correlationId: input.correlationId,
        },
        session,
      );
    });
  } catch (error) {
    if ((error as { code?: number }).code === 11000) {
      const raced = await WarningLetterFinalDocument.findOne({
        debtCaseId: input.debtCaseId,
        draftId: input.draftId,
        draftRevision: detail.draft!.draftRevision,
      }).lean();
      if (raced) {
        return {
          created: false,
          finalDocument: mapFinalDocumentView(raced as FinalDocumentLean),
        };
      }
    }
    mapMongoDraftWriteError(error);
    throw error;
  } finally {
    await session.endSession();
  }

  return {
    created: true,
    finalDocument: mapFinalDocumentView({
      finalDocumentId,
      debtCaseId: input.debtCaseId,
      draftId: detail.draft.draftId,
      draftRevision: detail.draft.draftRevision,
      status,
      contentSha256: operativeSnapshotForFinalize.contentSha256,
      materialInputsSha256: active.materialInputsSha256,
      letterCaseReference: detail.draft.letterCaseReference,
      contentSnapshot: operativeSnapshotForFinalize,
      finalizedAt,
      operativeBlockReasonsHe,
      pdfStorageKey: pdfResult.ok ? pdfResult.storageKey : null,
    }),
  };
}
