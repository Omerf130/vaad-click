import "server-only";

import { randomUUID } from "node:crypto";

import mongoose, { Types } from "mongoose";
import type { ClientSession } from "mongoose";

import { DebtCaseLawyerReviewStatus } from "@/modules/debt-cases/domain/debt-case-lawyer-review-status";
import { assertLawyerAdminDebtCaseReview } from "@/modules/debt-cases/services/debt-case-authorization.service";
import { getDebtCase } from "@/modules/debt-cases/services/debt-case.service";
import type { DebtCaseRecord } from "@/modules/debt-cases/domain/debt-case-record.types";
import { AuditWriteFailedError } from "@/shared/audit/errors/audit-errors";
import {
  WarningLetterDraftError,
  WarningLetterDraftErrorCode,
} from "@/modules/warning-letters/domain/warning-letter-draft-errors";
import { WarningLetterDraftInvalidationReason } from "@/modules/warning-letters/domain/warning-letter-draft-invalidation-reason";
import { WarningLetterDraftStatus } from "@/modules/warning-letters/domain/warning-letter-draft-status";
import { WarningLetterType } from "@/modules/warning-letters/domain/warning-letter-type";
import { invalidateActiveWarningLetterDraft } from "@/modules/warning-letters/services/warning-letter-draft-invalidation.service";
import { WarningLetterDraft } from "@/modules/warning-letters/infra/warning-letter-draft.model";
import { renderWarningLetterPreviewHtml } from "@/modules/warning-letters/render/render-warning-letter-html";
import {
  allocateLetterCaseReference,
  resolveLetterCaseReferenceForRegeneration,
} from "@/modules/warning-letters/services/warning-letter-case-reference.service";
import {
  recordWarningLetterDraftCreated,
  recordWarningLetterDraftRegenerated,
} from "@/modules/warning-letters/services/warning-letter-draft-audit.service";
import { WarningLetterDraftLoadState } from "@/modules/warning-letters/domain/warning-letter-draft-load-state";
import { WarningLetterDraftLegalApprovalStatus } from "@/modules/warning-letters/domain/warning-letter-draft-legal-approval-status";
import type { WarningLetterLawyerEditableClauseId } from "@/modules/warning-letters/domain/warning-letter-editable-clause";
import { WARNING_LETTER_LAWYER_EDITABLE_CLAUSE_IDS } from "@/modules/warning-letters/domain/warning-letter-editable-clause";
import {
  buildPersistedInitialWarningLetterSnapshotBundle,
  computeCurrentMaterialInputsSha256ForDebtCase,
} from "@/modules/warning-letters/services/warning-letter-snapshot-context.service";
import type { WarningLetterContentSnapshot } from "@/modules/warning-letters/snapshot/warning-letter-snapshot.types";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import { connectMongo } from "@/shared/db/connect";

export type WarningLetterDraftView = {
  draftId: string;
  debtCaseId: string;
  buildingId: string;
  letterType: WarningLetterType;
  templateVersionId: string;
  draftRevision: number;
  priorDraftId: string | null;
  letterCaseReference: string;
  status: WarningLetterDraftStatus;
  contentSha256: string;
  unapprovedTemplateVariantIds: string[];
  approvalReady: boolean;
  invalidationReason: string | null;
  invalidatedAtIso: string | null;
  createdAtIso: string;
  updatedAtIso: string;
  snapshot: WarningLetterContentSnapshot;
  html: string;
  previewWarningHe: string | null;
  /** True when this row is the sole active draft and matches current case material inputs. */
  isCurrentForCase: boolean;
  manuallyEdited: boolean;
  editedClauseIds: string[];
  concurrencyRevision: number;
  legalWordingApprovalStatus: WarningLetterDraftLegalApprovalStatus;
  legalWordingApprovedAtIso: string | null;
  editableClauses: Array<{
    clauseId: WarningLetterLawyerEditableClauseId;
    displayNumber: number;
    body: string;
  }>;
};

export type WarningLetterDraftDetailResult = {
  loadState: WarningLetterDraftLoadState;
  /** Populated only for active_current or active_stale (never for outdated content shown as current). */
  draft: WarningLetterDraftView | null;
  letterCaseReference: string | null;
  latestDraftRevision: number | null;
  invalidationReason: string | null;
  invalidatedAtIso: string | null;
  legalWordingApprovalStatus: WarningLetterDraftLegalApprovalStatus;
};

const SYNC_DRAFT_MAX_ATTEMPTS = 3;

function isTransientTransactionError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }
  const labels = (error as { errorLabels?: string[] }).errorLabels;
  if (labels?.includes("TransientTransactionError")) {
    return true;
  }
  const code = (error as { code?: number }).code;
  return code === 251;
}

function logDraftTiming(phase: string, debtCaseId: string, startedAtMs: number): void {
  if (process.env.DEBUG_WARNING_LETTER_DRAFT_TIMING !== "1") {
    return;
  }
  const elapsedMs = Math.round(performance.now() - startedAtMs);
  console.info(
    `[warning-letter-draft] phase=${phase} debtCaseIdPrefix=${debtCaseId.slice(0, 8)} elapsedMs=${elapsedMs}`,
  );
}

function mapAuditPersistenceError(error: unknown): never {
  if (error instanceof AuditWriteFailedError) {
    throw new WarningLetterDraftError(
      WarningLetterDraftErrorCode.AUDIT_PERSISTENCE,
      "Mandatory audit persistence failed",
    );
  }
  throw error;
}

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: number }).code === 11000
  );
}

/** Maps Mongo duplicate-key failures to lawyer-safe draft errors (never swallows audit failures). */
export function mapMongoDraftWriteError(error: unknown): never {
  if (error instanceof AuditWriteFailedError) {
    mapAuditPersistenceError(error);
  }
  if (isDuplicateKeyError(error)) {
    const keyPattern = (error as { keyPattern?: Record<string, number> }).keyPattern;
    const message = String((error as { message?: string }).message ?? "");
    if (
      keyPattern?.letterCaseReference != null ||
      message.includes("letterCaseReference")
    ) {
      throw new WarningLetterDraftError(
        WarningLetterDraftErrorCode.LEGACY_REFERENCE_UNIQUE_INDEX,
        "Legacy unique index on letterCaseReference blocks new draft revision",
      );
    }
    throw new WarningLetterDraftError(
      WarningLetterDraftErrorCode.CONCURRENT_DRAFT_CONFLICT,
      "Concurrent draft write conflict",
    );
  }
  throw error;
}

function toDraftView(
  doc: {
  draftId: string;
  debtCaseId: string;
  buildingId: string;
  letterType: WarningLetterType;
  templateVersionId: string;
  draftRevision: number;
  priorDraftId?: string | null;
  letterCaseReference: string;
  status: WarningLetterDraftStatus;
  contentSnapshot: WarningLetterContentSnapshot;
  contentSha256: string;
  unapprovedTemplateVariantIds: string[];
  approvalReady: boolean;
  invalidationReason?: string | null;
  invalidatedAt?: Date | null;
  manuallyEdited?: boolean;
  editedClauseIds?: string[];
  concurrencyRevision?: number;
  legalWordingApprovalStatus?: WarningLetterDraftLegalApprovalStatus;
  legalWordingApprovedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
  },
  options?: { isCurrentForCase?: boolean },
): WarningLetterDraftView {
  const snapshot = doc.contentSnapshot;
  const editableClauses = WARNING_LETTER_LAWYER_EDITABLE_CLAUSE_IDS.flatMap((clauseId) => {
    const clause = snapshot.numberedClauses.find((c) => c.clauseId === clauseId);
    if (!clause) {
      return [];
    }
    return [
      {
        clauseId,
        displayNumber: clause.displayNumber,
        body: clause.body,
      },
    ];
  });

  return {
    draftId: doc.draftId,
    debtCaseId: doc.debtCaseId,
    buildingId: doc.buildingId,
    letterType: doc.letterType,
    templateVersionId: doc.templateVersionId,
    draftRevision: doc.draftRevision,
    priorDraftId: doc.priorDraftId ?? null,
    letterCaseReference: doc.letterCaseReference,
    status: doc.status,
    contentSha256: doc.contentSha256,
    unapprovedTemplateVariantIds: doc.unapprovedTemplateVariantIds,
    approvalReady: doc.approvalReady,
    invalidationReason: doc.invalidationReason ?? null,
    invalidatedAtIso: doc.invalidatedAt ? doc.invalidatedAt.toISOString() : null,
    createdAtIso: doc.createdAt?.toISOString() ?? new Date().toISOString(),
    updatedAtIso: doc.updatedAt?.toISOString() ?? new Date().toISOString(),
    snapshot,
    html: renderWarningLetterPreviewHtml(snapshot),
    previewWarningHe: snapshot.previewWarningHe,
    isCurrentForCase: options?.isCurrentForCase ?? doc.status === WarningLetterDraftStatus.ACTIVE,
    manuallyEdited: Boolean(doc.manuallyEdited),
    editedClauseIds: doc.editedClauseIds ?? [],
    concurrencyRevision: doc.concurrencyRevision ?? 1,
    legalWordingApprovalStatus:
      doc.legalWordingApprovalStatus ?? WarningLetterDraftLegalApprovalStatus.NONE,
    legalWordingApprovedAtIso: doc.legalWordingApprovedAt
      ? doc.legalWordingApprovedAt.toISOString()
      : null,
    editableClauses,
  };
}

async function loadDebtCaseApprovedForLetterPrep(input: {
  context: AuthenticatedContext;
  debtCaseId: string;
}): Promise<DebtCaseRecord> {
  const record = await getDebtCase({ context: input.context, debtCaseId: input.debtCaseId });
  if (record.lawyerReviewStatus !== DebtCaseLawyerReviewStatus.APPROVED_FOR_LETTER_PREP) {
    throw new WarningLetterDraftError(
      WarningLetterDraftErrorCode.CASE_NOT_APPROVED_FOR_LETTER_PREP,
      "Debt case is not approved for letter preparation",
    );
  }
  return record;
}

async function insertWarningLetterDraftDocument(input: {
  context: AuthenticatedContext;
  debtCase: DebtCaseRecord;
  letterCaseReference: string;
  draftRevision: number;
  priorDraftId: string | null;
  bundle: Awaited<ReturnType<typeof buildPersistedInitialWarningLetterSnapshotBundle>>;
  session: ClientSession;
  correlationId?: string;
  auditTrail: "first_revision" | "subsequent_revision";
}): Promise<{ draftId: string }> {
  const draftId = randomUUID();
  const userId = new Types.ObjectId(input.context.user.id);
  const snapshot = input.bundle.snapshot;

  await WarningLetterDraft.create(
    [
      {
        draftId,
        debtCaseId: input.debtCase.debtCaseId,
        buildingId: input.debtCase.buildingId,
        letterType: WarningLetterType.INITIAL_WARNING,
        templateVersionId: snapshot.templateVersionId,
        draftRevision: input.draftRevision,
        priorDraftId: input.priorDraftId,
        letterCaseReference: input.letterCaseReference,
        status: WarningLetterDraftStatus.ACTIVE,
        contentSnapshot: snapshot,
        contentSha256: snapshot.contentSha256,
        materialInputsSha256: input.bundle.materialInputsSha256,
        unapprovedTemplateVariantIds: input.bundle.unapprovedTemplateVariantIds,
        approvalReady: input.bundle.approvalReady,
        invalidationReason: null,
        invalidatedAt: null,
        manuallyEdited: false,
        manualClauseOverrides: new Map(),
        editedClauseIds: [],
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
    { session: input.session },
  );

  if (input.auditTrail === "first_revision") {
    await recordWarningLetterDraftCreated({
      context: input.context,
      draftId,
      debtCaseId: input.debtCase.debtCaseId,
      buildingId: input.debtCase.buildingId,
      letterType: WarningLetterType.INITIAL_WARNING,
      draftRevision: input.draftRevision,
      letterCaseReference: input.letterCaseReference,
      templateVersionId: snapshot.templateVersionId,
      contentSha256: snapshot.contentSha256,
      approvalReady: input.bundle.approvalReady,
      correlationId: input.correlationId,
      session: input.session,
    });
  } else {
    if (!input.priorDraftId) {
      throw new Error("priorDraftId required for subsequent revision audit");
    }
    await recordWarningLetterDraftRegenerated({
      context: input.context,
      draftId,
      debtCaseId: input.debtCase.debtCaseId,
      buildingId: input.debtCase.buildingId,
      letterType: WarningLetterType.INITIAL_WARNING,
      draftRevision: input.draftRevision,
      letterCaseReference: input.letterCaseReference,
      templateVersionId: snapshot.templateVersionId,
      contentSha256: snapshot.contentSha256,
      approvalReady: input.bundle.approvalReady,
      priorDraftId: input.priorDraftId,
      correlationId: input.correlationId,
      session: input.session,
    });
  }

  return { draftId };
}

type SyncDraftResult = { draftId: string; created: boolean; draftRevision: number };

async function syncInitialWarningLetterDraftInSession(input: {
  context: AuthenticatedContext;
  debtCaseId: string;
  debtCase: DebtCaseRecord;
  session: ClientSession;
  correlationId?: string;
}): Promise<SyncDraftResult> {
  const active = await WarningLetterDraft.findOne({
    debtCaseId: input.debtCaseId,
    letterType: WarningLetterType.INITIAL_WARNING,
    status: WarningLetterDraftStatus.ACTIVE,
  })
    .session(input.session)
    .lean();

  if (active) {
    const materialSha = await computeCurrentMaterialInputsSha256ForDebtCase({
      context: input.context,
      debtCase: input.debtCase,
    });
    if (materialSha === active.materialInputsSha256) {
      return {
        draftId: active.draftId,
        created: false,
        draftRevision: active.draftRevision,
      };
    }
    await invalidateActiveWarningLetterDraft({
      context: input.context,
      draft: active as Parameters<typeof invalidateActiveWarningLetterDraft>[0]["draft"],
      reason: WarningLetterDraftInvalidationReason.DEBT_CASE_MATERIAL_EDIT,
      session: input.session,
      correlationId: input.correlationId,
    });
  }

  const racedActive = await WarningLetterDraft.findOne({
    debtCaseId: input.debtCaseId,
    letterType: WarningLetterType.INITIAL_WARNING,
    status: WarningLetterDraftStatus.ACTIVE,
  })
    .session(input.session)
    .lean();
  if (racedActive) {
    const materialSha = await computeCurrentMaterialInputsSha256ForDebtCase({
      context: input.context,
      debtCase: input.debtCase,
    });
    if (materialSha === racedActive.materialInputsSha256) {
      return {
        draftId: racedActive.draftId,
        created: false,
        draftRevision: racedActive.draftRevision,
      };
    }
  }

  const chainHead = await WarningLetterDraft.findOne({
    debtCaseId: input.debtCaseId,
    letterType: WarningLetterType.INITIAL_WARNING,
  })
    .sort({ draftRevision: -1 })
    .session(input.session)
    .lean();

  const letterDateIso = new Date().toISOString().slice(0, 10);
  let letterCaseReference: string;
  let draftRevision: number;
  let priorDraftId: string | null;
  let auditTrail: "first_revision" | "subsequent_revision";

  if (chainHead) {
    letterCaseReference = resolveLetterCaseReferenceForRegeneration({
      existingReference: chainHead.letterCaseReference,
    });
    draftRevision = chainHead.draftRevision + 1;
    priorDraftId = chainHead.draftId;
    auditTrail = "subsequent_revision";
  } else {
    letterCaseReference = await allocateLetterCaseReference({ letterDateIso, session: input.session });
    draftRevision = 1;
    priorDraftId = null;
    auditTrail = "first_revision";
  }

  const bundle = await buildPersistedInitialWarningLetterSnapshotBundle({
    context: input.context,
    debtCase: input.debtCase,
    letterCaseReference,
    letterDateIso,
  });

  try {
    const { draftId } = await insertWarningLetterDraftDocument({
      context: input.context,
      debtCase: input.debtCase,
      letterCaseReference,
      draftRevision,
      priorDraftId,
      bundle,
      session: input.session,
      correlationId: input.correlationId,
      auditTrail,
    });
    return { draftId, created: true, draftRevision };
  } catch (error) {
    // Do not query with an aborted transaction session (Mongo error 251).
    throw error;
  }
}

/**
 * Ensures an active draft exists and matches current approved case material inputs.
 * Creates the next revision when prior drafts were invalidated or material is stale.
 */
export async function syncInitialWarningLetterDraftForApprovedCase(input: {
  context: AuthenticatedContext;
  debtCaseId: string;
  debtCaseRecord?: DebtCaseRecord;
  session?: ClientSession;
  correlationId?: string;
}): Promise<SyncDraftResult> {
  await assertLawyerAdminDebtCaseReview({ context: input.context });
  await connectMongo();

  const debtCase =
    input.debtCaseRecord ??
    (await loadDebtCaseApprovedForLetterPrep({
      context: input.context,
      debtCaseId: input.debtCaseId,
    }));

  const run = async (session: ClientSession) =>
    syncInitialWarningLetterDraftInSession({
      context: input.context,
      debtCaseId: input.debtCaseId,
      debtCase,
      session,
      correlationId: input.correlationId,
    });

  if (input.session) {
    try {
      return await run(input.session);
    } catch (error) {
      mapAuditPersistenceError(error);
    }
  }

  let lastError: unknown;
  for (let attempt = 1; attempt <= SYNC_DRAFT_MAX_ATTEMPTS; attempt++) {
    const session = await mongoose.startSession();
    try {
      let result: SyncDraftResult | undefined;
      await session.withTransaction(async () => {
        result = await run(session);
      });
      return result!;
    } catch (error) {
      lastError = error;
      if (isDuplicateKeyError(error)) {
        const keyPattern = (error as { keyPattern?: Record<string, number> }).keyPattern;
        const message = String((error as { message?: string }).message ?? "");
        if (
          keyPattern?.letterCaseReference != null ||
          message.includes("letterCaseReference")
        ) {
          mapMongoDraftWriteError(error);
        }
      }
      const retriable =
        isDuplicateKeyError(error) || isTransientTransactionError(error);
      if (retriable && attempt < SYNC_DRAFT_MAX_ATTEMPTS) {
        const raced = await WarningLetterDraft.findOne({
          debtCaseId: input.debtCaseId,
          letterType: WarningLetterType.INITIAL_WARNING,
          status: WarningLetterDraftStatus.ACTIVE,
        }).lean();
        if (raced) {
          const materialSha = await computeCurrentMaterialInputsSha256ForDebtCase({
            context: input.context,
            debtCase,
          });
          if (materialSha === raced.materialInputsSha256) {
            return {
              draftId: raced.draftId,
              created: false,
              draftRevision: raced.draftRevision,
            };
          }
        }
        continue;
      }
      if (isDuplicateKeyError(error) || isTransientTransactionError(error)) {
        mapMongoDraftWriteError(error);
      }
      mapAuditPersistenceError(error);
    } finally {
      await session.endSession();
    }
  }
  mapMongoDraftWriteError(lastError ?? new Error("Warning letter draft sync failed"));
}

/** @deprecated Use syncInitialWarningLetterDraftForApprovedCase */
export async function ensureInitialWarningLetterDraft(input: {
  context: AuthenticatedContext;
  debtCaseId: string;
  debtCaseRecord?: DebtCaseRecord;
  session?: ClientSession;
  correlationId?: string;
}): Promise<{ draftId: string; created: boolean }> {
  const result = await syncInitialWarningLetterDraftForApprovedCase(input);
  return { draftId: result.draftId, created: result.created };
}

export async function getActiveWarningLetterDraftForDebtCase(input: {
  context: AuthenticatedContext;
  debtCaseId: string;
}): Promise<WarningLetterDraftView | null> {
  await assertLawyerAdminDebtCaseReview({ context: input.context });
  await connectMongo();

  const doc = await WarningLetterDraft.findOne({
    debtCaseId: input.debtCaseId,
    letterType: WarningLetterType.INITIAL_WARNING,
    status: WarningLetterDraftStatus.ACTIVE,
  }).lean();

  if (!doc) {
    return null;
  }

  const debtCase = await loadDebtCaseApprovedForLetterPrep({
    context: input.context,
    debtCaseId: input.debtCaseId,
  });
  const materialSha = await computeCurrentMaterialInputsSha256ForDebtCase({
    context: input.context,
    debtCase,
  });

  return toDraftView(doc as Parameters<typeof toDraftView>[0], {
    isCurrentForCase: materialSha === doc.materialInputsSha256,
  });
}

/** Returns only the active draft; never surfaces invalidated rows as current. */
export async function getCurrentWarningLetterDraftForDebtCase(input: {
  context: AuthenticatedContext;
  debtCaseId: string;
}): Promise<WarningLetterDraftView | null> {
  return getActiveWarningLetterDraftForDebtCase(input);
}

/**
 * Read-only loader for lawyer debt-case detail GET requests.
 * Never starts write transactions or creates draft revisions.
 */
export async function loadWarningLetterDraftDetailForApprovedCaseReadOnly(input: {
  context: AuthenticatedContext;
  debtCaseId: string;
  debtCaseRecord: DebtCaseRecord;
}): Promise<WarningLetterDraftDetailResult> {
  const startedAtMs = performance.now();
  await assertLawyerAdminDebtCaseReview({ context: input.context });
  await connectMongo();

  if (
    input.debtCaseRecord.lawyerReviewStatus !== DebtCaseLawyerReviewStatus.APPROVED_FOR_LETTER_PREP
  ) {
    throw new WarningLetterDraftError(
      WarningLetterDraftErrorCode.CASE_NOT_APPROVED_FOR_LETTER_PREP,
      "Debt case is not approved for letter preparation",
    );
  }

  const activeDoc = await WarningLetterDraft.findOne({
    debtCaseId: input.debtCaseId,
    letterType: WarningLetterType.INITIAL_WARNING,
    status: WarningLetterDraftStatus.ACTIVE,
  }).lean();
  logDraftTiming("read_active_draft", input.debtCaseId, startedAtMs);

  if (activeDoc) {
    const materialSha = await computeCurrentMaterialInputsSha256ForDebtCase({
      context: input.context,
      debtCase: input.debtCaseRecord,
    });
    logDraftTiming("read_material_hash", input.debtCaseId, startedAtMs);
    const isCurrent = materialSha === activeDoc.materialInputsSha256;
    const draftView = toDraftView(activeDoc as Parameters<typeof toDraftView>[0], {
      isCurrentForCase: isCurrent,
    });
    return {
      loadState: isCurrent
        ? WarningLetterDraftLoadState.ACTIVE_CURRENT
        : WarningLetterDraftLoadState.ACTIVE_STALE,
      draft: draftView,
      letterCaseReference: activeDoc.letterCaseReference,
      latestDraftRevision: activeDoc.draftRevision,
      invalidationReason: null,
      invalidatedAtIso: null,
      legalWordingApprovalStatus: draftView.legalWordingApprovalStatus,
    };
  }

  const chainHead = await WarningLetterDraft.findOne({
    debtCaseId: input.debtCaseId,
    letterType: WarningLetterType.INITIAL_WARNING,
  })
    .sort({ draftRevision: -1 })
    .lean();
  logDraftTiming("read_chain_head", input.debtCaseId, startedAtMs);

  if (!chainHead) {
    return {
      loadState: WarningLetterDraftLoadState.NO_DRAFT_YET,
      draft: null,
      letterCaseReference: null,
      latestDraftRevision: null,
      invalidationReason: null,
      invalidatedAtIso: null,
      legalWordingApprovalStatus: WarningLetterDraftLegalApprovalStatus.NONE,
    };
  }

  if (chainHead.status === WarningLetterDraftStatus.INVALIDATED) {
    return {
      loadState: WarningLetterDraftLoadState.NEEDS_REGENERATION,
      draft: null,
      letterCaseReference: chainHead.letterCaseReference,
      latestDraftRevision: chainHead.draftRevision,
      invalidationReason: chainHead.invalidationReason ?? null,
      invalidatedAtIso: chainHead.invalidatedAt
        ? chainHead.invalidatedAt.toISOString()
        : null,
      legalWordingApprovalStatus: WarningLetterDraftLegalApprovalStatus.NONE,
    };
  }

  return {
    loadState: WarningLetterDraftLoadState.NO_DRAFT_YET,
    draft: null,
    letterCaseReference: chainHead.letterCaseReference,
    latestDraftRevision: chainHead.draftRevision,
    invalidationReason: null,
    invalidatedAtIso: null,
    legalWordingApprovalStatus: WarningLetterDraftLegalApprovalStatus.NONE,
  };
}

/** @deprecated Use loadWarningLetterDraftDetailForApprovedCaseReadOnly on GET paths. */
export async function loadPersistedWarningLetterDraftForDebtCase(input: {
  context: AuthenticatedContext;
  debtCaseId: string;
}): Promise<WarningLetterDraftView> {
  const debtCase = await loadDebtCaseApprovedForLetterPrep({
    context: input.context,
    debtCaseId: input.debtCaseId,
  });
  const detail = await loadWarningLetterDraftDetailForApprovedCaseReadOnly({
    context: input.context,
    debtCaseId: input.debtCaseId,
    debtCaseRecord: debtCase,
  });
  if (
    detail.loadState !== WarningLetterDraftLoadState.ACTIVE_CURRENT ||
    !detail.draft
  ) {
    throw new WarningLetterDraftError(
      WarningLetterDraftErrorCode.NOT_FOUND,
      "No current active warning letter draft",
    );
  }
  return detail.draft;
}

/**
 * Explicit lawyer mutation: invalidate stale active drafts when needed, then create the next revision.
 * Works for invalidated chains and stale active rows (same sync path as lawyer approve).
 */
export async function regenerateWarningLetterDraftForApprovedCase(input: {
  context: AuthenticatedContext;
  debtCaseId: string;
  correlationId?: string;
}): Promise<WarningLetterDraftView> {
  const debtCase = await loadDebtCaseApprovedForLetterPrep({
    context: input.context,
    debtCaseId: input.debtCaseId,
  });

  await syncInitialWarningLetterDraftForApprovedCase({
    context: input.context,
    debtCaseId: input.debtCaseId,
    debtCaseRecord: debtCase,
    correlationId: input.correlationId,
  });

  const detail = await loadWarningLetterDraftDetailForApprovedCaseReadOnly({
    context: input.context,
    debtCaseId: input.debtCaseId,
    debtCaseRecord: debtCase,
  });

  if (detail.loadState === WarningLetterDraftLoadState.ACTIVE_STALE) {
    throw new WarningLetterDraftError(
      WarningLetterDraftErrorCode.STALE_DRAFT_REMAINS,
      "Active draft remains stale after regeneration attempt",
    );
  }

  if (detail.loadState !== WarningLetterDraftLoadState.ACTIVE_CURRENT || !detail.draft) {
    throw new WarningLetterDraftError(
      WarningLetterDraftErrorCode.NOT_FOUND,
      "Regenerated draft could not be loaded",
    );
  }

  return detail.draft;
}

/** @deprecated Use regenerateWarningLetterDraftForApprovedCase */
export async function regenerateInvalidatedWarningLetterDraft(input: {
  context: AuthenticatedContext;
  debtCaseId: string;
  correlationId?: string;
}): Promise<WarningLetterDraftView> {
  return regenerateWarningLetterDraftForApprovedCase(input);
}
