import "server-only";

import { randomUUID } from "node:crypto";

import type { ClientSession } from "mongoose";

import {
  writeAuditEvent,
  writeAuditEventMandatory,
} from "@/modules/audit/services/audit-writer.service";
import { computeWarningLetterTemplateVariantContentSha256 } from "@/modules/warning-letters/domain/warning-letter-template-variant-content-hash";
import {
  getTemplateVariantCatalogEntry,
  WARNING_LETTER_TEMPLATE_VARIANT_CATALOG,
  type WarningLetterTemplateVariantCatalogEntry,
} from "@/modules/warning-letters/domain/warning-letter-template-variant-catalog";
import { WarningLetterTemplateVariantApproval } from "@/modules/warning-letters/infra/warning-letter-template-variant-approval.model";
import { INITIAL_WARNING_TEMPLATE_VERSION_ID } from "@/modules/warning-letters/domain/warning-letter-type";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import { buildUserAuditActor } from "@/shared/audit/build-audit-actor";
import { AuditEventType } from "@/shared/audit/domain/audit-event-taxonomy";
import { AuditOutcome } from "@/shared/audit/domain/audit-outcome";
import { connectMongo } from "@/shared/db/connect";

export type TemplateVariantApprovalView = {
  variantId: string;
  templateVersionId: string;
  contentSha256: string;
  approvedAtIso: string;
  approvedByUserId: string;
};

export type TemplateVariantCatalogRow = WarningLetterTemplateVariantCatalogEntry & {
  contentSha256: string;
  approved: boolean;
  approvedAtIso: string | null;
};

export async function listWarningLetterTemplateVariantCatalogWithApprovalStatus(input?: {
  templateVersionId?: string;
}): Promise<TemplateVariantCatalogRow[]> {
  const templateVersionId = input?.templateVersionId ?? INITIAL_WARNING_TEMPLATE_VERSION_ID;
  await connectMongo();
  const approvals = await WarningLetterTemplateVariantApproval.find({ templateVersionId }).lean();
  const approvalByVariant = new Map(
    approvals.map((row) => [row.variantId, row] as const),
  );

  return WARNING_LETTER_TEMPLATE_VARIANT_CATALOG.filter(
    (entry) => entry.templateVersionId === templateVersionId,
  ).map((entry) => {
    const contentSha256 = computeWarningLetterTemplateVariantContentSha256({
      variantId: entry.variantId,
      templateVersionId: entry.templateVersionId,
    });
    const approval = approvalByVariant.get(entry.variantId);
    const approved =
      approval != null &&
      approval.contentSha256 === contentSha256 &&
      !entry.requiresLawyerClarification;
    return {
      ...entry,
      contentSha256,
      approved,
      approvedAtIso: approved && approval?.approvedAt ? approval.approvedAt.toISOString() : null,
    };
  });
}

export async function loadGloballyApprovedTemplateVariantIds(input?: {
  templateVersionId?: string;
}): Promise<Set<string>> {
  const rows = await listWarningLetterTemplateVariantCatalogWithApprovalStatus(input);
  return new Set(rows.filter((row) => row.approved).map((row) => row.variantId));
}

export async function approveWarningLetterTemplateVariant(input: {
  context: AuthenticatedContext;
  variantId: string;
  templateVersionId?: string;
  correlationId?: string;
  session?: ClientSession;
}): Promise<{ alreadyApproved: boolean; approval: TemplateVariantApprovalView }> {
  const templateVersionId = input.templateVersionId ?? INITIAL_WARNING_TEMPLATE_VERSION_ID;
  const entry = getTemplateVariantCatalogEntry(input.variantId);
  if (!entry || entry.templateVersionId !== templateVersionId) {
    throw new Error("Unknown template variant");
  }
  if (entry.requiresLawyerClarification) {
    throw new Error("Variant requires lawyer clarification before approval");
  }

  const contentSha256 = computeWarningLetterTemplateVariantContentSha256({
    variantId: input.variantId,
    templateVersionId,
  });

  await connectMongo();
  const existing = await WarningLetterTemplateVariantApproval.findOne({
    variantId: input.variantId,
    templateVersionId,
    contentSha256,
  }).lean();

  if (existing) {
    return {
      alreadyApproved: true,
      approval: {
        variantId: existing.variantId,
        templateVersionId: existing.templateVersionId,
        contentSha256: existing.contentSha256,
        approvedAtIso: existing.approvedAt.toISOString(),
        approvedByUserId: String(existing.approvedByUserId),
      },
    };
  }

  const approvedAt = new Date();
  const approvalId = randomUUID();
  const doc = {
    approvalId,
    variantId: input.variantId,
    templateVersionId,
    contentSha256,
    approvedByUserId: input.context.user.id,
    approvedAt,
  };

  const createOptions = input.session ? { session: input.session } : undefined;
  await WarningLetterTemplateVariantApproval.create([doc], createOptions);

  const auditPayload = {
    eventType: AuditEventType.LEGAL_DOCUMENT_WARNING_LETTER_TEMPLATE_VARIANT_APPROVED,
    actor: buildUserAuditActor(input.context),
    action: "warning_letter_template_variant_approve",
    outcome: AuditOutcome.SUCCESS,
    target: { entityType: "warning_letter_template_variant", entityId: input.variantId },
    metadata: {
      templateVersionId,
      contentSha256Prefix: contentSha256.slice(0, 16),
    },
    correlationId: input.correlationId,
  } as const;
  if (input.session) {
    await writeAuditEventMandatory(auditPayload, { session: input.session });
  } else {
    await writeAuditEvent(auditPayload, { mandatory: true });
  }

  return {
    alreadyApproved: false,
    approval: {
      variantId: input.variantId,
      templateVersionId,
      contentSha256,
      approvedAtIso: approvedAt.toISOString(),
      approvedByUserId: String(input.context.user.id),
    },
  };
}
