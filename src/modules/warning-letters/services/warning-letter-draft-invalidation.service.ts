import "server-only";

import { Types } from "mongoose";
import type { ClientSession } from "mongoose";

import type { DebtCaseRecord } from "@/modules/debt-cases/domain/debt-case-record.types";
import { WarningLetterDraftInvalidationReason } from "@/modules/warning-letters/domain/warning-letter-draft-invalidation-reason";
import { WarningLetterDraftStatus } from "@/modules/warning-letters/domain/warning-letter-draft-status";
import { WarningLetterType } from "@/modules/warning-letters/domain/warning-letter-type";
import { WarningLetterDraft } from "@/modules/warning-letters/infra/warning-letter-draft.model";
import { recordWarningLetterDraftInvalidated } from "@/modules/warning-letters/services/warning-letter-draft-audit.service";
import { buildPersistedInitialWarningLetterSnapshotBundle } from "@/modules/warning-letters/services/warning-letter-snapshot-context.service";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";

export async function invalidateActiveWarningLetterDraft(input: {
  context: AuthenticatedContext;
  draft: {
    draftId: string;
    debtCaseId: string;
    buildingId: string;
    letterType: WarningLetterType;
    draftRevision: number;
    letterCaseReference: string;
    templateVersionId: string;
    contentSha256: string;
    approvalReady: boolean;
  };
  reason: WarningLetterDraftInvalidationReason;
  session: ClientSession;
  correlationId?: string;
}): Promise<void> {
  const now = new Date();
  const updated = await WarningLetterDraft.findOneAndUpdate(
    {
      draftId: input.draft.draftId,
      status: WarningLetterDraftStatus.ACTIVE,
    },
    {
      $set: {
        status: WarningLetterDraftStatus.INVALIDATED,
        invalidationReason: input.reason,
        invalidatedAt: now,
        updatedByUserId: new Types.ObjectId(input.context.user.id),
      },
    },
    { session: input.session, returnDocument: "after" },
  ).lean();

  if (!updated) {
    return;
  }

  await recordWarningLetterDraftInvalidated({
    context: input.context,
    draftId: input.draft.draftId,
    debtCaseId: input.draft.debtCaseId,
    buildingId: input.draft.buildingId,
    letterType: input.draft.letterType,
    draftRevision: input.draft.draftRevision,
    letterCaseReference: input.draft.letterCaseReference,
    templateVersionId: input.draft.templateVersionId,
    contentSha256: input.draft.contentSha256,
    approvalReady: input.draft.approvalReady,
    invalidationReason: input.reason,
    correlationId: input.correlationId,
    session: input.session,
  });
}

export async function maybeInvalidateWarningLetterDraftOnDebtCaseChange(input: {
  context: AuthenticatedContext;
  debtCase: DebtCaseRecord;
  session: ClientSession;
  correlationId?: string;
  reason?: WarningLetterDraftInvalidationReason;
}): Promise<void> {
  const active = await WarningLetterDraft.findOne({
    debtCaseId: input.debtCase.debtCaseId,
    letterType: WarningLetterType.INITIAL_WARNING,
    status: WarningLetterDraftStatus.ACTIVE,
  })
    .session(input.session)
    .lean();

  if (!active) {
    return;
  }

  const letterDateIso = new Date().toISOString().slice(0, 10);
  const bundle = await buildPersistedInitialWarningLetterSnapshotBundle({
    context: input.context,
    debtCase: input.debtCase,
    letterCaseReference: active.letterCaseReference,
    letterDateIso,
  });
  const reason = input.reason ?? WarningLetterDraftInvalidationReason.DEBT_CASE_MATERIAL_EDIT;
  const materialChanged = bundle.materialInputsSha256 !== active.materialInputsSha256;

  if (
    !materialChanged &&
    reason !== WarningLetterDraftInvalidationReason.DEBT_CASE_REVIEW_INVALIDATED
  ) {
    return;
  }

  await invalidateActiveWarningLetterDraft({
    context: input.context,
    draft: active as Parameters<typeof invalidateActiveWarningLetterDraft>[0]["draft"],
    reason,
    session: input.session,
    correlationId: input.correlationId,
  });
}

export async function invalidateActiveWarningLetterDraftsForBuilding(input: {
  context: AuthenticatedContext;
  buildingId: string;
  session: ClientSession;
  correlationId?: string;
}): Promise<void> {
  const actives = await WarningLetterDraft.find({
    buildingId: input.buildingId,
    status: WarningLetterDraftStatus.ACTIVE,
  })
    .session(input.session)
    .lean();

  for (const draft of actives) {
    await invalidateActiveWarningLetterDraft({
      context: input.context,
      draft: draft as Parameters<typeof invalidateActiveWarningLetterDraft>[0]["draft"],
      reason: WarningLetterDraftInvalidationReason.BUILDING_MATERIAL_CHANGE,
      session: input.session,
      correlationId: input.correlationId,
    });
  }
}

export async function invalidateActiveWarningLetterDraftsForFinancialSettingsPublish(input: {
  context: AuthenticatedContext;
  publishedSettingsVersionId: string;
  session: ClientSession;
  correlationId?: string;
}): Promise<void> {
  const actives = await WarningLetterDraft.find({
    status: WarningLetterDraftStatus.ACTIVE,
    $or: [
      {
        "contentSnapshot.settingsVersionId": {
          $nin: [null, input.publishedSettingsVersionId],
        },
      },
      {
        "contentSnapshot.monetaryCompleteness": "incomplete_missing_published_settings",
      },
    ],
  })
    .session(input.session)
    .lean();

  for (const draft of actives) {
    await invalidateActiveWarningLetterDraft({
      context: input.context,
      draft: draft as Parameters<typeof invalidateActiveWarningLetterDraft>[0]["draft"],
      reason: WarningLetterDraftInvalidationReason.FINANCIAL_SETTINGS_PUBLISHED,
      session: input.session,
      correlationId: input.correlationId,
    });
  }
}
