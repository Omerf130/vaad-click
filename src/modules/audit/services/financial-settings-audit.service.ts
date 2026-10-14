import "server-only";

import type { ClientSession } from "mongoose";

import { writeAuditEventMandatory } from "@/modules/audit/services/audit-writer.service";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import { buildUserAuditActor } from "@/shared/audit/build-audit-actor";
import { AuditEventType } from "@/shared/audit/domain/audit-event-taxonomy";
import { AuditOutcome } from "@/shared/audit/domain/audit-outcome";

type FinancialSettingsAuditTarget = {
  settingsVersionId: string;
  session: ClientSession;
  context: AuthenticatedContext;
  correlationId?: string;
};

export async function recordFinancialSettingsDraftCreated(input: {
  settingsVersionId: string;
  revision: number;
  clonedFromSettingsVersionId?: string;
  context: AuthenticatedContext;
  correlationId?: string;
  session: ClientSession;
}): Promise<void> {
  await writeAuditEventMandatory(
    {
      eventType: AuditEventType.SYSTEM_CONFIG_FINANCIAL_SETTINGS_DRAFT_CREATED,
      actor: buildUserAuditActor(input.context),
      action: "financial_settings_draft_create",
      outcome: AuditOutcome.SUCCESS,
      target: {
        entityType: "financial_settings_version",
        entityId: input.settingsVersionId,
      },
      metadata: {
        revision: input.revision,
        ...(input.clonedFromSettingsVersionId
          ? { clonedFromSettingsVersionId: input.clonedFromSettingsVersionId }
          : {}),
      },
      correlationId: input.correlationId,
    },
    { session: input.session },
  );
}

export async function recordFinancialSettingsDraftUpdated(input: {
  settingsVersionId: string;
  revision: number;
  context: AuthenticatedContext;
  correlationId?: string;
  session: ClientSession;
}): Promise<void> {
  await writeAuditEventMandatory(
    {
      eventType: AuditEventType.SYSTEM_CONFIG_FINANCIAL_SETTINGS_DRAFT_UPDATED,
      actor: buildUserAuditActor(input.context),
      action: "financial_settings_draft_update",
      outcome: AuditOutcome.SUCCESS,
      target: {
        entityType: "financial_settings_version",
        entityId: input.settingsVersionId,
      },
      metadata: { revision: input.revision },
      correlationId: input.correlationId,
    },
    { session: input.session },
  );
}

export async function recordFinancialSettingsDraftDiscarded(input: {
  settingsVersionId: string;
  revision: number;
  context: AuthenticatedContext;
  correlationId?: string;
  session: ClientSession;
}): Promise<void> {
  await writeAuditEventMandatory(
    {
      eventType: AuditEventType.SYSTEM_CONFIG_FINANCIAL_SETTINGS_DRAFT_DISCARDED,
      actor: buildUserAuditActor(input.context),
      action: "financial_settings_draft_discard",
      outcome: AuditOutcome.SUCCESS,
      target: {
        entityType: "financial_settings_version",
        entityId: input.settingsVersionId,
      },
      metadata: { revision: input.revision },
      correlationId: input.correlationId,
    },
    { session: input.session },
  );
}

export async function recordFinancialSettingsVersionPublished(
  input: FinancialSettingsAuditTarget & {
    versionNumber: number;
    effectiveFromIso: string;
    revision: number;
  },
): Promise<void> {
  await writeAuditEventMandatory(
    {
      eventType: AuditEventType.SYSTEM_CONFIG_FINANCIAL_SETTINGS_VERSION_PUBLISHED,
      actor: buildUserAuditActor(input.context),
      action: "financial_settings_publish",
      outcome: AuditOutcome.SUCCESS,
      target: {
        entityType: "financial_settings_version",
        entityId: input.settingsVersionId,
      },
      metadata: {
        revision: input.revision,
        versionNumber: input.versionNumber,
        effectiveFromIso: input.effectiveFromIso,
      },
      correlationId: input.correlationId,
    },
    { session: input.session },
  );
}
