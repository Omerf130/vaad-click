import "server-only";

import { FinancialSettingsVersionStatus } from "@/modules/financial-settings/domain/financial-settings-version-status";
import {
  FinancialSettingsError,
  FinancialSettingsErrorCode,
} from "@/modules/financial-settings/domain/financial-settings-errors";
import {
  toPublishedFinancialSettingsVersion,
  type PublishedFinancialSettingsVersion,
} from "@/modules/financial-settings/domain/published-financial-settings-version";
import { FinancialSettingsVersion } from "@/modules/financial-settings/infra/financial-settings-version.model";
import { assertLawyerAdmin } from "@/modules/financial-settings/services/assert-lawyer-admin";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import { connectMongo } from "@/shared/db/connect";

export async function getFinancialSettingsVersionByPublicId(input: {
  context: AuthenticatedContext;
  settingsVersionId: string;
}): Promise<PublishedFinancialSettingsVersion | null> {
  assertLawyerAdmin(input.context);
  await connectMongo();

  const document = await FinancialSettingsVersion.findOne({
    settingsVersionId: input.settingsVersionId,
    status: FinancialSettingsVersionStatus.PUBLISHED,
  }).lean();

  if (!document) {
    return null;
  }

  return toPublishedFinancialSettingsVersion(document);
}

export async function getPublishedFinancialSettingsHistory(input: {
  context: AuthenticatedContext;
}): Promise<PublishedFinancialSettingsVersion[]> {
  assertLawyerAdmin(input.context);
  await connectMongo();

  const documents = await FinancialSettingsVersion.find({
    status: FinancialSettingsVersionStatus.PUBLISHED,
  })
    .sort({ effectiveFrom: -1 })
    .lean();

  return documents.map((document) => toPublishedFinancialSettingsVersion(document));
}

export async function getCurrentFinancialSettingsDraft(input: {
  context: AuthenticatedContext;
}) {
  assertLawyerAdmin(input.context);
  await connectMongo();

  return FinancialSettingsVersion.findOne({
    status: FinancialSettingsVersionStatus.DRAFT,
  }).lean();
}

/**
 * Returns the published version whose effectiveFrom is the latest still not after `asOf`.
 * Returns null when no published version has started yet (including future-only schedules).
 */
export async function resolveApplicableFinancialSettingsVersion(input: {
  context: AuthenticatedContext;
  asOf: Date;
}): Promise<PublishedFinancialSettingsVersion | null> {
  assertLawyerAdmin(input.context);
  await connectMongo();

  const document = await FinancialSettingsVersion.findOne({
    status: FinancialSettingsVersionStatus.PUBLISHED,
    effectiveFrom: { $lte: input.asOf },
  })
    .sort({ effectiveFrom: -1 })
    .lean();

  if (!document) {
    return null;
  }

  return toPublishedFinancialSettingsVersion(document);
}

export async function requirePublishedFinancialSettingsVersion(input: {
  context: AuthenticatedContext;
  settingsVersionId: string;
}): Promise<PublishedFinancialSettingsVersion> {
  const version = await getFinancialSettingsVersionByPublicId(input);
  if (!version) {
    throw new FinancialSettingsError(
      FinancialSettingsErrorCode.SOURCE_NOT_PUBLISHED,
      "Published financial settings version was not found",
    );
  }
  return version;
}
