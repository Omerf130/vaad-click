import "server-only";

import { randomUUID } from "node:crypto";

import mongoose, { Types } from "mongoose";
import type { ClientSession } from "mongoose";

import type { BuildingLegalReadinessResult } from "@/modules/debt-cases/domain/debt-case-legal-readiness";
import type { DebtCaseRecord } from "@/modules/debt-cases/domain/debt-case-record.types";
import { assertLawyerAdminDebtCaseReview } from "@/modules/debt-cases/services/debt-case-authorization.service";
import { getDebtCase } from "@/modules/debt-cases/services/debt-case.service";
import { loadBuildingLegalReadinessForDebtCase } from "@/modules/debt-cases/services/debt-case-legal-readiness.loader";
import { LegalDocumentTemplateOperativeStatus } from "@/modules/legal-document-templates/domain/legal-document-template-operative-status";
import type { StatementOfClaimDraftContentSnapshot } from "@/modules/statement-of-claim-drafts/domain/statement-of-claim-draft-content-snapshot.types";
import { resolveStatementOfClaimDraftConcurrencyRevision } from "@/modules/statement-of-claim-drafts/domain/statement-of-claim-draft-concurrency";
import {
  StatementOfClaimDraftError,
  StatementOfClaimDraftErrorCode,
} from "@/modules/statement-of-claim-drafts/domain/statement-of-claim-draft-errors";
import {
  collectStatementOfClaimDraftReadinessBlockersHe,
  type StatementOfClaimDraftReadiness,
} from "@/modules/statement-of-claim-drafts/domain/statement-of-claim-draft-readiness";
import { StatementOfClaimDraftStatus } from "@/modules/statement-of-claim-drafts/domain/statement-of-claim-draft-status";
import { StatementOfClaimDraft } from "@/modules/statement-of-claim-drafts/infra/statement-of-claim-draft.model";
import {
  recordStatementOfClaimDraftCreated,
  recordStatementOfClaimDraftRegenerated,
} from "@/modules/statement-of-claim-drafts/services/statement-of-claim-draft-audit.service";
import {
  buildStatementOfClaimDraftBundle,
  loadBuildingAddressHeForDebtCase,
} from "@/modules/statement-of-claim-drafts/services/statement-of-claim-draft-snapshot.service";
import {
  requireDevelopmentStatementOfClaimTemplateRevision,
  resolveDevelopmentStatementOfClaimTemplateRevision,
} from "@/modules/statement-of-claim-drafts/services/statement-of-claim-template-resolution.service";
import { DebtCaseDebtorResponse } from "@/modules/debt-cases/infra/debt-case-debtor-response.model";
import { listDebtCaseDocumentAssetsForLawyerAdmin } from "@/modules/document-assets/services/document-asset.service";
import { loadWarningLetterFinalDocumentForCase } from "@/modules/warning-letters/services/warning-letter-finalization.service";
import { listWarningLetterDeliveryRecords } from "@/modules/warning-letters/services/warning-letter-delivery.service";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import { connectMongo } from "@/shared/db/connect";

export type StatementOfClaimDraftView = {
  draftId: string;
  debtCaseId: string;
  buildingId: string;
  templateRevisionId: string;
  draftRevision: number;
  operativeStatus: typeof LegalDocumentTemplateOperativeStatus.DEVELOPMENT_ONLY;
  status: StatementOfClaimDraftStatus;
  contentSnapshot: StatementOfClaimDraftContentSnapshot;
  contentSha256: string;
  materialInputsSha256: string;
  createdAtIso: string;
  updatedAtIso: string;
  isMaterialCurrent: boolean;
  concurrencyRevision: number;
  manuallyEdited: boolean;
};

export type StatementOfClaimDraftRevisionHistoryRow = {
  draftId: string;
  draftRevision: number;
  status: StatementOfClaimDraftStatus;
  createdAtIso: string;
  contentSha256Prefix: string;
  manuallyEdited: boolean;
};

export type StatementOfClaimDraftWorkspaceView = {
  readiness: StatementOfClaimDraftReadiness;
  activeDraft: StatementOfClaimDraftView | null;
  revisionHistory: StatementOfClaimDraftRevisionHistoryRow[];
};

function mapDraftView(
  row: {
    draftId: string;
    debtCaseId: string;
    buildingId: string;
    templateRevisionId: string;
    draftRevision: number;
    operativeStatus: string;
    contentSnapshot: unknown;
    contentSha256: string;
    materialInputsSha256: string;
    status: StatementOfClaimDraftStatus;
    concurrencyRevision?: number | null;
    manuallyEdited?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  },
  isMaterialCurrent: boolean,
): StatementOfClaimDraftView {
  return {
    draftId: row.draftId,
    debtCaseId: row.debtCaseId,
    buildingId: row.buildingId,
    templateRevisionId: row.templateRevisionId,
    draftRevision: row.draftRevision,
    operativeStatus: LegalDocumentTemplateOperativeStatus.DEVELOPMENT_ONLY,
    status: row.status,
    contentSnapshot: row.contentSnapshot as StatementOfClaimDraftContentSnapshot,
    contentSha256: row.contentSha256,
    materialInputsSha256: row.materialInputsSha256,
    createdAtIso: row.createdAt?.toISOString() ?? new Date(0).toISOString(),
    updatedAtIso: row.updatedAt?.toISOString() ?? new Date(0).toISOString(),
    isMaterialCurrent,
    concurrencyRevision: resolveStatementOfClaimDraftConcurrencyRevision(
      row.concurrencyRevision,
    ),
    manuallyEdited: Boolean(row.manuallyEdited),
  };
}

async function computeReadinessForCase(input: {
  context: AuthenticatedContext;
  debtCase: DebtCaseRecord;
  legalReadiness: BuildingLegalReadinessResult;
  buildingAddressHe: string;
}): Promise<StatementOfClaimDraftReadiness> {
  const finalDoc = await loadWarningLetterFinalDocumentForCase(input.debtCase.debtCaseId);
  const templateRevision = await resolveDevelopmentStatementOfClaimTemplateRevision();
  const deliveryRecords = await listWarningLetterDeliveryRecords(input.debtCase.debtCaseId);
  const documents = await listDebtCaseDocumentAssetsForLawyerAdmin({
    context: input.context,
    debtCaseId: input.debtCase.debtCaseId,
    buildingId: input.debtCase.buildingId,
  });
  const debtorResponses = await DebtCaseDebtorResponse.find({
    debtCaseId: input.debtCase.debtCaseId,
  }).lean();

  return collectStatementOfClaimDraftReadinessBlockersHe({
    authorized: true,
    debtCase: input.debtCase,
    buildingAddressPresent: input.buildingAddressHe.trim().length > 0 && input.buildingAddressHe !== "—",
    debtorDesignationPresent: Boolean(input.debtCase.parties.legalDebtorDesignation),
    finalWarningLetterPresent: finalDoc != null,
    templateRevisionPresent: templateRevision != null,
    legalReadiness: input.legalReadiness,
    hasDisputedResponse: debtorResponses.some((r) => r.responseType === "debt_disputed"),
    hasDeliveryConfirmation: deliveryRecords.some((r) => r.confirmedDeliveredAtIso != null),
    hasEvidenceAssets: documents.length > 0,
    lawyerControlledFieldsIncomplete: true,
  });
}

async function computeCurrentMaterialSha256(input: {
  debtCase: DebtCaseRecord;
  templateRevision: Awaited<ReturnType<typeof requireDevelopmentStatementOfClaimTemplateRevision>>;
  finalDocument: NonNullable<Awaited<ReturnType<typeof loadWarningLetterFinalDocumentForCase>>>;
  deliveryRecords: Awaited<ReturnType<typeof listWarningLetterDeliveryRecords>>;
  buildingAddressHe: string;
}): Promise<string> {
  const bundle = await buildStatementOfClaimDraftBundle({
    debtCase: input.debtCase,
    templateRevision: input.templateRevision,
    finalDocument: {
      finalDocumentId: input.finalDocument.finalDocumentId,
      contentSha256: input.finalDocument.contentSha256,
      materialInputsSha256: input.finalDocument.materialInputsSha256,
      contentSnapshot: input.finalDocument.contentSnapshot,
      letterCaseReference: input.finalDocument.letterCaseReference,
    },
    deliveryRecords: input.deliveryRecords,
    buildingAddressHe: input.buildingAddressHe,
    hasEvidenceAssets: false,
  });
  return bundle.materialInputsSha256;
}

export async function loadStatementOfClaimDraftWorkspace(input: {
  context: AuthenticatedContext;
  debtCaseId: string;
  debtCase?: DebtCaseRecord;
  legalReadiness?: BuildingLegalReadinessResult;
}): Promise<StatementOfClaimDraftWorkspaceView> {
  await connectMongo();
  await assertLawyerAdminDebtCaseReview({ context: input.context });

  let debtCase = input.debtCase;
  if (!debtCase) {
    debtCase = await getDebtCase({
      context: input.context,
      debtCaseId: input.debtCaseId,
    });
  }

  const legalReadiness =
    input.legalReadiness ??
    (await loadBuildingLegalReadinessForDebtCase(debtCase.buildingId));

  const buildingAddressHe = await loadBuildingAddressHeForDebtCase(debtCase.buildingId);
  const readiness = await computeReadinessForCase({
    context: input.context,
    debtCase,
    legalReadiness,
    buildingAddressHe,
  });

  const active = await StatementOfClaimDraft.findOne({
    debtCaseId: input.debtCaseId,
    status: StatementOfClaimDraftStatus.ACTIVE,
  }).lean();

  const history = await StatementOfClaimDraft.find({ debtCaseId: input.debtCaseId })
    .sort({ draftRevision: -1 })
    .limit(20)
    .lean();

  let activeView: StatementOfClaimDraftView | null = null;
  if (active) {
    let isMaterialCurrent = true;
    const finalDoc = await loadWarningLetterFinalDocumentForCase(input.debtCaseId);
    const templateRevision = await resolveDevelopmentStatementOfClaimTemplateRevision();
    if (finalDoc && templateRevision) {
      const deliveryRecords = await listWarningLetterDeliveryRecords(input.debtCaseId);
      const currentSha = await computeCurrentMaterialSha256({
        debtCase,
        templateRevision,
        finalDocument: finalDoc,
        deliveryRecords,
        buildingAddressHe,
      });
      isMaterialCurrent = currentSha === active.materialInputsSha256;
    } else {
      isMaterialCurrent = false;
    }
    activeView = mapDraftView(active, isMaterialCurrent);
  }

  return {
    readiness,
    activeDraft: activeView,
    revisionHistory: history.map((row) => ({
      draftId: row.draftId,
      draftRevision: row.draftRevision,
      status: row.status as StatementOfClaimDraftStatus,
      createdAtIso: row.createdAt?.toISOString() ?? new Date(0).toISOString(),
      contentSha256Prefix: row.contentSha256.slice(0, 12),
      manuallyEdited: Boolean(row.manuallyEdited),
    })),
  };
}

export async function loadStatementOfClaimDraftRevisionForLawyer(input: {
  context: AuthenticatedContext;
  debtCaseId: string;
  draftId: string;
}): Promise<StatementOfClaimDraftView | null> {
  await assertLawyerAdminDebtCaseReview({ context: input.context });
  await connectMongo();
  const row = await StatementOfClaimDraft.findOne({
    debtCaseId: input.debtCaseId,
    draftId: input.draftId,
  }).lean();
  if (!row) {
    return null;
  }
  return mapDraftView(row, false);
}

async function supersedeActiveDraft(input: {
  context: AuthenticatedContext;
  debtCaseId: string;
  session: ClientSession;
}): Promise<string | null> {
  const active = await StatementOfClaimDraft.findOne({
    debtCaseId: input.debtCaseId,
    status: StatementOfClaimDraftStatus.ACTIVE,
  })
    .session(input.session)
    .lean();

  if (!active) {
    return null;
  }

  const now = new Date();
  await StatementOfClaimDraft.updateOne(
    { draftId: active.draftId, status: StatementOfClaimDraftStatus.ACTIVE },
    {
      $set: {
        status: StatementOfClaimDraftStatus.SUPERSEDED,
        supersededAt: now,
        updatedByUserId: new Types.ObjectId(input.context.user.id),
      },
    },
    { session: input.session },
  );

  return active.draftId;
}

export type GenerateStatementOfClaimDraftResult = {
  draftId: string;
  draftRevision: number;
  created: boolean;
};

export async function generateDevelopmentStatementOfClaimDraft(input: {
  context: AuthenticatedContext;
  debtCaseId: string;
  correlationId?: string;
  forceRegenerate?: boolean;
  acknowledgeReplaceLawyerEdits?: boolean;
}): Promise<GenerateStatementOfClaimDraftResult> {
  await connectMongo();
  await assertLawyerAdminDebtCaseReview({ context: input.context });

  const debtCase = await getDebtCase({
    context: input.context,
    debtCaseId: input.debtCaseId,
  });

  const legalReadiness = await loadBuildingLegalReadinessForDebtCase(debtCase.buildingId);
  const buildingAddressHe = await loadBuildingAddressHeForDebtCase(debtCase.buildingId);

  const readiness = await computeReadinessForCase({
    context: input.context,
    debtCase,
    legalReadiness,
    buildingAddressHe,
  });

  if (readiness.hardBlockersHe.length > 0) {
    throw new StatementOfClaimDraftError(
      StatementOfClaimDraftErrorCode.HARD_BLOCKERS,
      "Statement of claim draft blocked",
      readiness.hardBlockersHe,
    );
  }

  const finalDoc = await loadWarningLetterFinalDocumentForCase(input.debtCaseId);
  if (!finalDoc) {
    throw new StatementOfClaimDraftError(
      StatementOfClaimDraftErrorCode.HARD_BLOCKERS,
      "Missing final warning letter",
      ["חסר מכתב התראה סופי."],
    );
  }

  const templateRevision = await requireDevelopmentStatementOfClaimTemplateRevision();
  const deliveryRecords = await listWarningLetterDeliveryRecords(input.debtCaseId);

  const bundle = await buildStatementOfClaimDraftBundle({
    debtCase,
    templateRevision,
    finalDocument: {
      finalDocumentId: finalDoc.finalDocumentId,
      contentSha256: finalDoc.contentSha256,
      materialInputsSha256: finalDoc.materialInputsSha256,
      contentSnapshot: finalDoc.contentSnapshot,
      letterCaseReference: finalDoc.letterCaseReference,
    },
    deliveryRecords,
    buildingAddressHe,
    hasEvidenceAssets: false,
  });

  const session = await mongoose.startSession();
  try {
    let created = false;
    let draftId = "";
    let draftRevision = 0;

    await session.withTransaction(async () => {
      const existingActive = await StatementOfClaimDraft.findOne({
        debtCaseId: input.debtCaseId,
        status: StatementOfClaimDraftStatus.ACTIVE,
      })
        .session(session)
        .lean();

      if (
        existingActive &&
        !input.forceRegenerate &&
        existingActive.materialInputsSha256 === bundle.materialInputsSha256 &&
        existingActive.templateRevisionId === templateRevision.revisionId
      ) {
        draftId = existingActive.draftId;
        draftRevision = existingActive.draftRevision;
        return;
      }

      if (
        existingActive?.manuallyEdited &&
        !input.acknowledgeReplaceLawyerEdits
      ) {
        throw new StatementOfClaimDraftError(
          StatementOfClaimDraftErrorCode.LAWYER_EDITS_REPLACE_REQUIRED,
          "Lawyer edits would be replaced",
          [
            "קיימות עריכות עורך דין בטיוטה. סמן אישור להחלפת תוכן ערוך לפני יצירה מחדש מנתוני מערכת.",
          ],
        );
      }

      const chainHead = await StatementOfClaimDraft.findOne({ debtCaseId: input.debtCaseId })
        .sort({ draftRevision: -1 })
        .session(session)
        .lean();

      draftRevision = chainHead ? chainHead.draftRevision + 1 : 1;
      const priorDraftId = existingActive
        ? await supersedeActiveDraft({ context: input.context, debtCaseId: input.debtCaseId, session })
        : chainHead?.draftId ?? null;

      draftId = randomUUID();
      const userOid = new Types.ObjectId(input.context.user.id);

      await StatementOfClaimDraft.create(
        [
          {
            draftId,
            debtCaseId: input.debtCaseId,
            buildingId: debtCase.buildingId,
            templateRevisionId: templateRevision.revisionId,
            draftRevision,
            priorDraftId,
            operativeStatus: LegalDocumentTemplateOperativeStatus.DEVELOPMENT_ONLY,
            contentSnapshot: bundle.snapshot,
            contentSha256: bundle.contentSha256,
            materialInputsSha256: bundle.materialInputsSha256,
            status: StatementOfClaimDraftStatus.ACTIVE,
            concurrencyRevision: 1,
            manuallyEdited: false,
            editedSectionIds: [],
            createdByUserId: userOid,
            updatedByUserId: userOid,
          },
        ],
        { session },
      );

      created = true;

      if (draftRevision === 1) {
        await recordStatementOfClaimDraftCreated({
          context: input.context,
          draftId,
          debtCaseId: input.debtCaseId,
          buildingId: debtCase.buildingId,
          draftRevision,
          templateRevisionId: templateRevision.revisionId,
          contentSha256: bundle.contentSha256,
          materialInputsSha256: bundle.materialInputsSha256,
          correlationId: input.correlationId,
          session,
        });
      } else if (priorDraftId) {
        await recordStatementOfClaimDraftRegenerated({
          context: input.context,
          draftId,
          debtCaseId: input.debtCaseId,
          buildingId: debtCase.buildingId,
          draftRevision,
          templateRevisionId: templateRevision.revisionId,
          contentSha256: bundle.contentSha256,
          materialInputsSha256: bundle.materialInputsSha256,
          priorDraftId,
          correlationId: input.correlationId,
          session,
        });
      }
    });

    return { draftId, draftRevision, created };
  } finally {
    await session.endSession();
  }
}