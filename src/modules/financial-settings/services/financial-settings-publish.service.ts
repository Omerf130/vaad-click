import "server-only";

import mongoose from "mongoose";
import { Types } from "mongoose";

import { recordFinancialSettingsVersionPublished } from "@/modules/audit/services/financial-settings-audit.service";
import {
  FinancialSettingsError,
  FinancialSettingsErrorCode,
} from "@/modules/financial-settings/domain/financial-settings-errors";
import { FinancialSettingsVersionStatus } from "@/modules/financial-settings/domain/financial-settings-version-status";
import { AmountsMonetaryBasis } from "@/modules/financial-settings/domain/amounts-monetary-basis";
import { toPublishedFinancialSettingsVersion } from "@/modules/financial-settings/domain/published-financial-settings-version";
import { FinancialSettingsVersion } from "@/modules/financial-settings/infra/financial-settings-version.model";
import { assertLawyerAdmin } from "@/modules/financial-settings/services/assert-lawyer-admin";
import { allocatePublishedVersionNumber } from "@/modules/financial-settings/services/financial-settings-counter.service";
import { rethrowFinancialSettingsMongoError } from "@/modules/financial-settings/services/financial-settings-mongo-errors";
import {
  mapVatScheduleInputToDates,
  publishFinancialSettingsInputSchema,
  type PublishFinancialSettingsInput,
} from "@/modules/financial-settings/validation/financial-settings-content.schema";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import { AuditWriteFailedError } from "@/shared/audit/errors/audit-errors";
import { connectMongo } from "@/shared/db/connect";
import {
  isEffectiveFromNotBeforeTodayJerusalem,
  startOfDayJerusalem,
} from "@/shared/time/jerusalem-calendar";

function mapPublishError(error: unknown): never {
  if (error instanceof AuditWriteFailedError) {
    throw new FinancialSettingsError(
      FinancialSettingsErrorCode.AUDIT_PERSISTENCE,
      "Financial settings publication could not be recorded",
    );
  }
  rethrowFinancialSettingsMongoError(error);
}

export async function publishFinancialSettingsDraft(input: {
  context: AuthenticatedContext;
  payload: PublishFinancialSettingsInput;
  correlationId?: string;
}) {
  assertLawyerAdmin(input.context);
  const parsed = publishFinancialSettingsInputSchema.parse(input.payload);
  const effectiveFrom = startOfDayJerusalem(parsed.effectiveFromIso);

  if (!isEffectiveFromNotBeforeTodayJerusalem(effectiveFrom)) {
    throw new FinancialSettingsError(
      FinancialSettingsErrorCode.RETROACTIVE_EFFECTIVE_DATE,
      "Financial settings effective date must be today or later in Asia/Jerusalem",
    );
  }

  const vatSchedule = mapVatScheduleInputToDates(parsed.vatSchedule);
  const publishedAt = new Date();

  await connectMongo();
  const session = await mongoose.startSession();
  let publishedSettingsVersionId = "";

  try {
    await session.withTransaction(async () => {
      const draft = await FinancialSettingsVersion.findOne({
        status: FinancialSettingsVersionStatus.DRAFT,
        revision: parsed.revision,
      })
        .session(session)
        .lean();

      if (!draft) {
        throw new FinancialSettingsError(
          FinancialSettingsErrorCode.DRAFT_REVISION_CONFLICT,
          "Financial settings draft revision conflict or missing draft",
        );
      }

      publishedSettingsVersionId = draft.settingsVersionId;

      const versionNumber = await allocatePublishedVersionNumber(session);

      const updated = await FinancialSettingsVersion.findOneAndUpdate(
        {
          _id: draft._id,
          status: FinancialSettingsVersionStatus.DRAFT,
          revision: parsed.revision,
        },
        {
          $set: {
            status: FinancialSettingsVersionStatus.PUBLISHED,
            versionNumber,
            effectiveFrom,
            publishedAt,
            publishedByUserId: new Types.ObjectId(input.context.user.id),
            currency: parsed.currency,
            amountsMonetaryBasis: AmountsMonetaryBasis.GROSS_INCLUSIVE_VAT,
            amounts: parsed.amounts,
            vatSchedule,
            escalation: parsed.escalation,
            platformFees: parsed.platformFees,
            notesInternal: parsed.notesInternal,
          },
        },
        { new: true, session },
      ).lean();

      if (!updated) {
        throw new FinancialSettingsError(
          FinancialSettingsErrorCode.DRAFT_REVISION_CONFLICT,
          "Financial settings draft could not be published",
        );
      }

      await recordFinancialSettingsVersionPublished({
        settingsVersionId: draft.settingsVersionId,
        versionNumber,
        effectiveFromIso: parsed.effectiveFromIso,
        revision: parsed.revision,
        context: input.context,
        correlationId: input.correlationId,
        session,
      });
    });
  } catch (error) {
    mapPublishError(error);
  } finally {
    await session.endSession();
  }

  const published = await FinancialSettingsVersion.findOne({
    settingsVersionId: publishedSettingsVersionId,
    status: FinancialSettingsVersionStatus.PUBLISHED,
  }).lean();

  if (!published) {
    throw new FinancialSettingsError(
      FinancialSettingsErrorCode.AUDIT_PERSISTENCE,
      "Published financial settings version could not be loaded",
    );
  }

  return toPublishedFinancialSettingsVersion(published);
}
