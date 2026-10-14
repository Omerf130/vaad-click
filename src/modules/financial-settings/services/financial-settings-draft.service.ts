import "server-only";

import { randomUUID } from "node:crypto";

import mongoose from "mongoose";
import { Types } from "mongoose";

import {
  recordFinancialSettingsDraftCreated,
  recordFinancialSettingsDraftDiscarded,
  recordFinancialSettingsDraftUpdated,
} from "@/modules/audit/services/financial-settings-audit.service";
import {
  AmountsMonetaryBasis,
  isGrossInclusiveVatBasis,
} from "@/modules/financial-settings/domain/amounts-monetary-basis";
import { CourtCostsPolicy } from "@/modules/financial-settings/domain/court-costs-policy";
import { EscalationCalculationBase } from "@/modules/financial-settings/domain/escalation-calculation-base";
import {
  FinancialSettingsError,
  FinancialSettingsErrorCode,
} from "@/modules/financial-settings/domain/financial-settings-errors";
import { FinancialSettingsVersionStatus } from "@/modules/financial-settings/domain/financial-settings-version-status";
import { FinancialSettingsVersion } from "@/modules/financial-settings/infra/financial-settings-version.model";
import { assertLawyerAdmin } from "@/modules/financial-settings/services/assert-lawyer-admin";
import { rethrowFinancialSettingsMongoError } from "@/modules/financial-settings/services/financial-settings-mongo-errors";
import { requirePublishedFinancialSettingsVersion } from "@/modules/financial-settings/services/financial-settings-query.service";
import {
  draftFinancialSettingsContentSchema,
  mapVatScheduleInputToDates,
  type DraftFinancialSettingsContentInput,
} from "@/modules/financial-settings/validation/financial-settings-content.schema";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import { AuditWriteFailedError } from "@/shared/audit/errors/audit-errors";
import { CurrencyCode } from "@/shared/financial/currency";
import { connectMongo } from "@/shared/db/connect";

function mapAuditPersistenceError(error: unknown): never {
  if (error instanceof AuditWriteFailedError) {
    throw new FinancialSettingsError(
      FinancialSettingsErrorCode.AUDIT_PERSISTENCE,
      "Financial settings change could not be recorded",
    );
  }
  rethrowFinancialSettingsMongoError(error);
}

type DraftContentFields = {
  currency?: CurrencyCode;
  amountsMonetaryBasis?: AmountsMonetaryBasis;
  amounts?: DraftFinancialSettingsContentInput["amounts"];
  vatSchedule?: ReturnType<typeof mapVatScheduleInputToDates>;
  escalation?: DraftFinancialSettingsContentInput["escalation"];
  platformFees?: DraftFinancialSettingsContentInput["platformFees"];
  notesInternal?: string;
};

function buildDraftContentUpdate(content: DraftFinancialSettingsContentInput): DraftContentFields {
  const update: DraftContentFields = {};

  if (content.currency !== undefined) {
    update.currency = content.currency;
  }
  if (content.amountsMonetaryBasis !== undefined) {
    update.amountsMonetaryBasis = content.amountsMonetaryBasis;
  }
  if (content.amounts !== undefined) {
    update.amounts = content.amounts;
  }
  if (content.vatSchedule !== undefined) {
    update.vatSchedule = mapVatScheduleInputToDates(content.vatSchedule);
  }
  if (content.escalation !== undefined) {
    update.escalation = content.escalation;
  }
  if (content.platformFees !== undefined) {
    update.platformFees = content.platformFees;
  }
  if (content.notesInternal !== undefined) {
    update.notesInternal = content.notesInternal;
  }

  return update;
}

export async function createFinancialSettingsDraft(input: {
  context: AuthenticatedContext;
  correlationId?: string;
  initial?: DraftFinancialSettingsContentInput;
}) {
  assertLawyerAdmin(input.context);
  const parsedInitial = input.initial
    ? draftFinancialSettingsContentSchema.parse(input.initial)
    : undefined;

  await connectMongo();
  const session = await mongoose.startSession();
  const settingsVersionId = randomUUID();

  try {
    await session.withTransaction(async () => {
      const existingDraft = await FinancialSettingsVersion.findOne({
        status: FinancialSettingsVersionStatus.DRAFT,
      })
        .session(session)
        .lean();

      if (existingDraft) {
        throw new FinancialSettingsError(
          FinancialSettingsErrorCode.DRAFT_ALREADY_EXISTS,
          "A financial settings draft already exists",
        );
      }

      const contentUpdate = parsedInitial ? buildDraftContentUpdate(parsedInitial) : {};

      await FinancialSettingsVersion.create(
        [
          {
            settingsVersionId,
            status: FinancialSettingsVersionStatus.DRAFT,
            createdByUserId: new Types.ObjectId(input.context.user.id),
            revision: 1,
            currency: contentUpdate.currency ?? CurrencyCode.ILS,
            amounts: contentUpdate.amounts ?? {},
            vatSchedule: contentUpdate.vatSchedule ?? [],
            escalation: {
              calculationBase:
                contentUpdate.escalation?.calculationBase ??
                EscalationCalculationBase.UNSPECIFIED,
              courtCostsPolicy:
                contentUpdate.escalation?.courtCostsPolicy ?? CourtCostsPolicy.UNSPECIFIED,
              ...(contentUpdate.escalation?.recoveryFeeRateBasisPoints !== undefined
                ? {
                    recoveryFeeRateBasisPoints:
                      contentUpdate.escalation.recoveryFeeRateBasisPoints,
                  }
                : {}),
              ...(contentUpdate.escalation?.successFeeExclusions
                ? { successFeeExclusions: contentUpdate.escalation.successFeeExclusions }
                : {}),
              ...(contentUpdate.escalation?.collectionAllocationOrder
                ? {
                    collectionAllocationOrder:
                      contentUpdate.escalation.collectionAllocationOrder,
                  }
                : {}),
            },
            ...(contentUpdate.platformFees ? { platformFees: contentUpdate.platformFees } : {}),
            notesInternal: contentUpdate.notesInternal,
          },
        ],
        { session },
      );

      await recordFinancialSettingsDraftCreated({
        settingsVersionId,
        revision: 1,
        context: input.context,
        correlationId: input.correlationId,
        session,
      });
    });
  } catch (error) {
    mapAuditPersistenceError(error);
  } finally {
    await session.endSession();
  }

  return FinancialSettingsVersion.findOne({ settingsVersionId }).lean();
}

export async function createFinancialSettingsDraftFromPublished(input: {
  context: AuthenticatedContext;
  sourceSettingsVersionId: string;
  correlationId?: string;
}) {
  assertLawyerAdmin(input.context);
  await requirePublishedFinancialSettingsVersion({
    context: input.context,
    settingsVersionId: input.sourceSettingsVersionId,
  });

  await connectMongo();

  const sourceDoc = await FinancialSettingsVersion.findOne({
    settingsVersionId: input.sourceSettingsVersionId,
    status: FinancialSettingsVersionStatus.PUBLISHED,
  }).lean();

  if (!sourceDoc) {
    throw new FinancialSettingsError(
      FinancialSettingsErrorCode.SOURCE_NOT_PUBLISHED,
      "Published financial settings version was not found",
    );
  }

  const sourceBasis =
    sourceDoc.amountsMonetaryBasis ?? AmountsMonetaryBasis.LEGACY_NET_EXCLUSIVE_VAT;
  const clonedAmounts = isGrossInclusiveVatBasis(sourceBasis)
    ? {
        debtorTreatmentFeeGross: sourceDoc.amounts?.debtorTreatmentFeeGross,
        committeeTreatmentFeeWhenDebtorWaivedGross:
          sourceDoc.amounts?.committeeTreatmentFeeWhenDebtorWaivedGross,
      }
    : {
        debtorTreatmentFeeExVat: sourceDoc.amounts?.debtorTreatmentFeeExVat,
        committeeTreatmentFeeWhenDebtorWaivedExVat:
          sourceDoc.amounts?.committeeTreatmentFeeWhenDebtorWaivedExVat,
      };
  const session = await mongoose.startSession();
  const settingsVersionId = randomUUID();

  try {
    await session.withTransaction(async () => {
      const existingDraft = await FinancialSettingsVersion.findOne({
        status: FinancialSettingsVersionStatus.DRAFT,
      })
        .session(session)
        .lean();

      if (existingDraft) {
        throw new FinancialSettingsError(
          FinancialSettingsErrorCode.DRAFT_ALREADY_EXISTS,
          "A financial settings draft already exists",
        );
      }

      await FinancialSettingsVersion.create(
        [
          {
            settingsVersionId,
            status: FinancialSettingsVersionStatus.DRAFT,
            createdByUserId: new Types.ObjectId(input.context.user.id),
            revision: 1,
            currency: sourceDoc.currency,
            amountsMonetaryBasis: sourceBasis,
            amounts: clonedAmounts,
            vatSchedule: sourceDoc.vatSchedule,
            escalation: sourceDoc.escalation,
            ...(sourceDoc.platformFees ? { platformFees: sourceDoc.platformFees } : {}),
            provenance: {
              clonedFromSettingsVersionId: sourceDoc.settingsVersionId,
            },
          },
        ],
        { session },
      );

      await recordFinancialSettingsDraftCreated({
        settingsVersionId,
        revision: 1,
        clonedFromSettingsVersionId: sourceDoc.settingsVersionId,
        context: input.context,
        correlationId: input.correlationId,
        session,
      });
    });
  } catch (error) {
    mapAuditPersistenceError(error);
  } finally {
    await session.endSession();
  }

  return FinancialSettingsVersion.findOne({ settingsVersionId }).lean();
}

export async function updateFinancialSettingsDraft(input: {
  context: AuthenticatedContext;
  revision: number;
  content: DraftFinancialSettingsContentInput;
  correlationId?: string;
}) {
  assertLawyerAdmin(input.context);
  const parsedContent = draftFinancialSettingsContentSchema.parse(input.content);
  const contentUpdate = buildDraftContentUpdate(parsedContent);

  if (Object.keys(contentUpdate).length === 0) {
    throw new FinancialSettingsError(
      FinancialSettingsErrorCode.VALIDATION,
      "Draft update must include at least one field",
    );
  }

  await connectMongo();
  const session = await mongoose.startSession();
  let updatedSettingsVersionId = "";

  try {
    await session.withTransaction(async () => {
      const draft = await FinancialSettingsVersion.findOne({
        status: FinancialSettingsVersionStatus.DRAFT,
        revision: input.revision,
      })
        .session(session)
        .lean();

      if (!draft) {
        throw new FinancialSettingsError(
          FinancialSettingsErrorCode.DRAFT_REVISION_CONFLICT,
          "Financial settings draft revision conflict or missing draft",
        );
      }

      updatedSettingsVersionId = draft.settingsVersionId;
      const nextRevision = draft.revision + 1;

      // Replacing `amounts` via $set drops legacy net / stale net-VAT fields. Do not combine
      // $set on `amounts` with $unset on `amounts.*` — MongoDB rejects that as a path conflict.
      const updated = await FinancialSettingsVersion.findOneAndUpdate(
        {
          _id: draft._id,
          status: FinancialSettingsVersionStatus.DRAFT,
          revision: input.revision,
        },
        {
          $set: {
            ...contentUpdate,
            revision: nextRevision,
          },
        },
        { new: true, session },
      ).lean();

      if (!updated) {
        throw new FinancialSettingsError(
          FinancialSettingsErrorCode.DRAFT_REVISION_CONFLICT,
          "Financial settings draft revision conflict",
        );
      }

      await recordFinancialSettingsDraftUpdated({
        settingsVersionId: draft.settingsVersionId,
        revision: nextRevision,
        context: input.context,
        correlationId: input.correlationId,
        session,
      });
    });
  } catch (error) {
    mapAuditPersistenceError(error);
  } finally {
    await session.endSession();
  }

  return FinancialSettingsVersion.findOne({ settingsVersionId: updatedSettingsVersionId }).lean();
}

export async function discardFinancialSettingsDraft(input: {
  context: AuthenticatedContext;
  correlationId?: string;
}) {
  assertLawyerAdmin(input.context);
  await connectMongo();
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const draft = await FinancialSettingsVersion.findOne({
        status: FinancialSettingsVersionStatus.DRAFT,
      })
        .session(session)
        .lean();

      if (!draft) {
        throw new FinancialSettingsError(
          FinancialSettingsErrorCode.NO_DRAFT,
          "No financial settings draft exists",
        );
      }

      await recordFinancialSettingsDraftDiscarded({
        settingsVersionId: draft.settingsVersionId,
        revision: draft.revision,
        context: input.context,
        correlationId: input.correlationId,
        session,
      });

      const deleted = await FinancialSettingsVersion.deleteOne(
        {
          _id: draft._id,
          status: FinancialSettingsVersionStatus.DRAFT,
        },
        { session },
      );

      if (deleted.deletedCount !== 1) {
        throw new FinancialSettingsError(
          FinancialSettingsErrorCode.DRAFT_REVISION_CONFLICT,
          "Financial settings draft could not be discarded",
        );
      }
    });
  } catch (error) {
    mapAuditPersistenceError(error);
  } finally {
    await session.endSession();
  }
}
