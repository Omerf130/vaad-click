import "server-only";

import { randomUUID } from "node:crypto";

import mongoose, { Types } from "mongoose";

import {
  writeAuditEvent,
  writeAuditEventMandatory,
} from "@/modules/audit/services/audit-writer.service";
import {
  LEGAL_DOCUMENT_TEMPLATE_CATEGORY_VALUES,
  legalDocumentTemplateCategoryLabelHe,
  type LegalDocumentTemplateCategory,
} from "@/modules/legal-document-templates/domain/legal-document-template-category";
import { computeLegalDocumentTemplateContentSha256 } from "@/modules/legal-document-templates/domain/legal-document-template-content-hash";
import {
  LegalDocumentTemplateError,
  LegalDocumentTemplateErrorCode,
} from "@/modules/legal-document-templates/domain/legal-document-template-errors";
import { evaluatePublishEligibility } from "@/modules/legal-document-templates/domain/legal-document-template-lifecycle.rules";
import { LEGAL_DOCUMENT_TEMPLATE_DEV_PLACEHOLDER_HE } from "@/modules/legal-document-templates/domain/legal-document-template-placeholder";
import { LegalDocumentTemplateRevisionStatus } from "@/modules/legal-document-templates/domain/legal-document-template-revision-status";
import { LegalDocumentTemplateApproval } from "@/modules/legal-document-templates/infra/legal-document-template-approval.model";
import { LegalDocumentTemplate } from "@/modules/legal-document-templates/infra/legal-document-template.model";
import { LegalDocumentTemplateRevision } from "@/modules/legal-document-templates/infra/legal-document-template-revision.model";
import { assertLawyerAdminOrganization } from "@/modules/organizations/services/assert-lawyer-admin";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import { buildUserAuditActor } from "@/shared/audit/build-audit-actor";
import { AuditEventType } from "@/shared/audit/domain/audit-event-taxonomy";
import { AuditOutcome } from "@/shared/audit/domain/audit-outcome";
import { connectMongo } from "@/shared/db/connect";

export type LegalDocumentTemplateRevisionView = {
  revisionId: string;
  revisionNumber: number;
  bodyText: string;
  contentSha256: string;
  lifecycleStatus: string;
  isCurrentDraft: boolean;
  createdAtIso: string;
  publishedAtIso: string | null;
  approved: boolean;
  approvedAtIso: string | null;
};

export type LegalDocumentTemplateCategoryWorkspace = {
  category: LegalDocumentTemplateCategory;
  titleHe: string;
  templateId: string;
  currentDraft: LegalDocumentTemplateRevisionView | null;
  latestPublished: LegalDocumentTemplateRevisionView | null;
  revisionHistory: LegalDocumentTemplateRevisionView[];
};

function mapRevisionView(input: {
  revision: {
    revisionId: string;
    revisionNumber: number;
    bodyText: string;
    contentSha256: string;
    lifecycleStatus: string;
    isCurrentDraft: boolean;
    createdAt?: Date;
    publishedAt?: Date | null;
  };
  approval: { approvedAt: Date } | null;
}): LegalDocumentTemplateRevisionView {
  const approved = input.approval != null;
  return {
    revisionId: input.revision.revisionId,
    revisionNumber: input.revision.revisionNumber,
    bodyText: input.revision.bodyText,
    contentSha256: input.revision.contentSha256,
    lifecycleStatus: input.revision.lifecycleStatus,
    isCurrentDraft: input.revision.isCurrentDraft,
    createdAtIso: input.revision.createdAt?.toISOString() ?? new Date(0).toISOString(),
    publishedAtIso: input.revision.publishedAt ? input.revision.publishedAt.toISOString() : null,
    approved,
    approvedAtIso: input.approval?.approvedAt.toISOString() ?? null,
  };
}

function assertLawyerAdmin(context: AuthenticatedContext): void {
  try {
    assertLawyerAdminOrganization(context);
  } catch {
    throw new LegalDocumentTemplateError(
      LegalDocumentTemplateErrorCode.FORBIDDEN,
      "Lawyer admin required",
    );
  }
}

async function ensureTemplateShell(category: LegalDocumentTemplateCategory) {
  await connectMongo();
  let template = await LegalDocumentTemplate.findOne({ category }).lean();
  if (!template) {
    const templateId = randomUUID();
    const created = await LegalDocumentTemplate.create({
      templateId,
      category,
      currentDraftRevisionId: null,
      latestPublishedRevisionId: null,
    });
    template = created.toObject();
  }
  return template;
}

async function loadApprovalByRevisionId(revisionId: string) {
  return LegalDocumentTemplateApproval.findOne({ revisionId }).lean();
}

async function nextRevisionNumber(templateId: string): Promise<number> {
  const latest = await LegalDocumentTemplateRevision.findOne({ templateId })
    .sort({ revisionNumber: -1 })
    .lean();
  return (latest?.revisionNumber ?? 0) + 1;
}

export async function ensureLegalDocumentTemplateShells(): Promise<void> {
  await connectMongo();
  for (const category of LEGAL_DOCUMENT_TEMPLATE_CATEGORY_VALUES) {
    await ensureTemplateShell(category);
  }
}

export async function loadLegalDocumentTemplateWorkspace(): Promise<
  LegalDocumentTemplateCategoryWorkspace[]
> {
  await ensureLegalDocumentTemplateShells();
  const templates = await LegalDocumentTemplate.find({}).lean();
  const byCategory = new Map(templates.map((row) => [row.category, row] as const));

  const workspaces: LegalDocumentTemplateCategoryWorkspace[] = [];
  for (const category of LEGAL_DOCUMENT_TEMPLATE_CATEGORY_VALUES) {
    const template = byCategory.get(category);
    if (!template) {
      continue;
    }
    const revisions = await LegalDocumentTemplateRevision.find({ templateId: template.templateId })
      .sort({ revisionNumber: -1 })
      .lean();
    const approvals = await LegalDocumentTemplateApproval.find({
      templateId: template.templateId,
    }).lean();
    const approvalByRevision = new Map(
      approvals.map((row) => [row.revisionId, row] as const),
    );

    const revisionHistory = revisions.map((revision) =>
      mapRevisionView({
        revision,
        approval: approvalByRevision.get(revision.revisionId) ?? null,
      }),
    );

    const currentDraftRow = revisions.find((row) => row.isCurrentDraft) ?? null;
    const latestPublishedRow =
      revisions.find(
        (row) => row.lifecycleStatus === LegalDocumentTemplateRevisionStatus.PUBLISHED,
      ) ??
      revisions.find(
        (row) => row.lifecycleStatus === LegalDocumentTemplateRevisionStatus.SUPERSEDED,
      ) ??
      null;

    workspaces.push({
      category,
      titleHe: legalDocumentTemplateCategoryLabelHe(category),
      templateId: template.templateId,
      currentDraft: currentDraftRow
        ? mapRevisionView({
            revision: currentDraftRow,
            approval: approvalByRevision.get(currentDraftRow.revisionId) ?? null,
          })
        : null,
      latestPublished: latestPublishedRow
        ? mapRevisionView({
            revision: latestPublishedRow,
            approval: approvalByRevision.get(latestPublishedRow.revisionId) ?? null,
          })
        : null,
      revisionHistory,
    });
  }
  return workspaces;
}

export async function createLegalDocumentTemplateDraft(input: {
  context: AuthenticatedContext;
  category: LegalDocumentTemplateCategory;
  useDevPlaceholder?: boolean;
  correlationId?: string;
}): Promise<{ revisionId: string }> {
  assertLawyerAdmin(input.context);
  const template = await ensureTemplateShell(input.category);
  if (template.currentDraftRevisionId) {
    throw new LegalDocumentTemplateError(
      LegalDocumentTemplateErrorCode.DRAFT_ALREADY_EXISTS,
      "Active draft exists",
    );
  }

  const revisionId = randomUUID();
  const revisionNumber = await nextRevisionNumber(template.templateId);
  const bodyText = input.useDevPlaceholder ? LEGAL_DOCUMENT_TEMPLATE_DEV_PLACEHOLDER_HE : "";
  const contentSha256 = computeLegalDocumentTemplateContentSha256({
    category: input.category,
    revisionId,
    bodyText,
  });

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await LegalDocumentTemplateRevision.create(
        [
          {
            revisionId,
            templateId: template.templateId,
            category: input.category,
            revisionNumber,
            bodyText,
            contentSha256,
            lifecycleStatus: LegalDocumentTemplateRevisionStatus.DRAFT,
            isCurrentDraft: true,
            createdByUserId: new Types.ObjectId(input.context.user.id),
            publishedAt: null,
          },
        ],
        { session },
      );
      await LegalDocumentTemplate.updateOne(
        { templateId: template.templateId },
        { $set: { currentDraftRevisionId: revisionId } },
        { session },
      );
      await writeAuditEventMandatory(
        {
          eventType: AuditEventType.LEGAL_DOCUMENT_ONBOARDING_TEMPLATE_DRAFT_CREATED,
          actor: buildUserAuditActor(input.context),
          action: "legal_document_template_draft_create",
          outcome: AuditOutcome.SUCCESS,
          target: { entityType: "legal_document_template", entityId: template.templateId },
          metadata: {
            category: input.category,
            revisionId,
            revisionNumber,
            contentSha256Prefix: contentSha256.slice(0, 16),
          },
          correlationId: input.correlationId,
        },
        { session },
      );
    });
  } finally {
    await session.endSession();
  }

  return { revisionId };
}

export async function saveLegalDocumentTemplateDraftRevision(input: {
  context: AuthenticatedContext;
  category: LegalDocumentTemplateCategory;
  bodyText: string;
  correlationId?: string;
}): Promise<{ revisionId: string; revisionNumber: number }> {
  assertLawyerAdmin(input.context);
  const template = await ensureTemplateShell(input.category);
  const currentDraft = template.currentDraftRevisionId
    ? await LegalDocumentTemplateRevision.findOne({
        revisionId: template.currentDraftRevisionId,
        isCurrentDraft: true,
        lifecycleStatus: LegalDocumentTemplateRevisionStatus.DRAFT,
      }).lean()
    : null;

  const revisionId = randomUUID();
  const revisionNumber = await nextRevisionNumber(template.templateId);
  const contentSha256 = computeLegalDocumentTemplateContentSha256({
    category: input.category,
    revisionId,
    bodyText: input.bodyText,
  });

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      if (currentDraft) {
        await LegalDocumentTemplateRevision.updateOne(
          { revisionId: currentDraft.revisionId },
          {
            $set: {
              isCurrentDraft: false,
              lifecycleStatus: LegalDocumentTemplateRevisionStatus.DRAFT_SUPERSEDED,
            },
          },
          { session },
        );
      }
      await LegalDocumentTemplateRevision.create(
        [
          {
            revisionId,
            templateId: template.templateId,
            category: input.category,
            revisionNumber,
            bodyText: input.bodyText,
            contentSha256,
            lifecycleStatus: LegalDocumentTemplateRevisionStatus.DRAFT,
            isCurrentDraft: true,
            createdByUserId: new Types.ObjectId(input.context.user.id),
            publishedAt: null,
          },
        ],
        { session },
      );
      await LegalDocumentTemplate.updateOne(
        { templateId: template.templateId },
        { $set: { currentDraftRevisionId: revisionId } },
        { session },
      );
      await writeAuditEventMandatory(
        {
          eventType: AuditEventType.LEGAL_DOCUMENT_ONBOARDING_TEMPLATE_DRAFT_SAVED,
          actor: buildUserAuditActor(input.context),
          action: "legal_document_template_draft_save",
          outcome: AuditOutcome.SUCCESS,
          target: { entityType: "legal_document_template", entityId: template.templateId },
          metadata: {
            category: input.category,
            revisionId,
            revisionNumber,
            supersededRevisionId: currentDraft?.revisionId ?? null,
            contentSha256Prefix: contentSha256.slice(0, 16),
          },
          correlationId: input.correlationId,
        },
        { session },
      );
    });
  } finally {
    await session.endSession();
  }

  return { revisionId, revisionNumber };
}

export async function approveLegalDocumentTemplateRevision(input: {
  context: AuthenticatedContext;
  revisionId: string;
  correlationId?: string;
}): Promise<{ alreadyApproved: boolean; contentSha256: string }> {
  assertLawyerAdmin(input.context);
  await connectMongo();
  const revision = await LegalDocumentTemplateRevision.findOne({
    revisionId: input.revisionId,
  }).lean();
  if (!revision) {
    throw new LegalDocumentTemplateError(
      LegalDocumentTemplateErrorCode.UNKNOWN_REVISION,
      "Unknown revision",
    );
  }
  if (!revision.isCurrentDraft) {
    throw new LegalDocumentTemplateError(
      LegalDocumentTemplateErrorCode.NOT_CURRENT_DRAFT,
      "Not current draft",
    );
  }
  if (revision.lifecycleStatus !== LegalDocumentTemplateRevisionStatus.DRAFT) {
    throw new LegalDocumentTemplateError(
      LegalDocumentTemplateErrorCode.REVISION_IMMUTABLE,
      "Revision not draft",
    );
  }

  const expectedHash = computeLegalDocumentTemplateContentSha256({
    category: revision.category as LegalDocumentTemplateCategory,
    revisionId: revision.revisionId,
    bodyText: revision.bodyText,
  });
  if (expectedHash !== revision.contentSha256) {
    throw new LegalDocumentTemplateError(
      LegalDocumentTemplateErrorCode.CONTENT_HASH_MISMATCH,
      "Stored hash mismatch",
    );
  }

  const existing = await LegalDocumentTemplateApproval.findOne({
    revisionId: revision.revisionId,
    contentSha256: revision.contentSha256,
  }).lean();
  if (existing) {
    return { alreadyApproved: true, contentSha256: revision.contentSha256 };
  }

  const approvedAt = new Date();
  const approvalId = randomUUID();
  await LegalDocumentTemplateApproval.create({
    approvalId,
    templateId: revision.templateId,
    revisionId: revision.revisionId,
    category: revision.category,
    contentSha256: revision.contentSha256,
    approvedByUserId: new Types.ObjectId(input.context.user.id),
    approvedAt,
  });

  await writeAuditEvent(
    {
      eventType: AuditEventType.LEGAL_DOCUMENT_ONBOARDING_TEMPLATE_REVISION_APPROVED,
      actor: buildUserAuditActor(input.context),
      action: "legal_document_template_revision_approve",
      outcome: AuditOutcome.SUCCESS,
      target: { entityType: "legal_document_template_revision", entityId: revision.revisionId },
      metadata: {
        category: revision.category,
        templateId: revision.templateId,
        contentSha256Prefix: revision.contentSha256.slice(0, 16),
      },
      correlationId: input.correlationId,
    },
    { mandatory: true },
  );

  return { alreadyApproved: false, contentSha256: revision.contentSha256 };
}

export async function publishLegalDocumentTemplateRevision(input: {
  context: AuthenticatedContext;
  revisionId: string;
  correlationId?: string;
}): Promise<{ publishedRevisionId: string }> {
  assertLawyerAdmin(input.context);
  await connectMongo();
  const revision = await LegalDocumentTemplateRevision.findOne({
    revisionId: input.revisionId,
  }).lean();
  if (!revision) {
    throw new LegalDocumentTemplateError(
      LegalDocumentTemplateErrorCode.UNKNOWN_REVISION,
      "Unknown revision",
    );
  }

  const approval = await loadApprovalByRevisionId(revision.revisionId);
  const eligibility = evaluatePublishEligibility({
    lifecycleStatus: revision.lifecycleStatus as LegalDocumentTemplateRevisionStatus,
    isCurrentDraft: revision.isCurrentDraft,
    contentSha256: revision.contentSha256,
    approvalContentSha256: approval?.contentSha256 ?? null,
  });
  if (!eligibility.ok) {
    await writeAuditEvent({
      eventType: AuditEventType.LEGAL_DOCUMENT_ONBOARDING_TEMPLATE_PUBLISH_BLOCKED,
      actor: buildUserAuditActor(input.context),
      action: "legal_document_template_publish_blocked",
      outcome: AuditOutcome.FAILURE,
      target: { entityType: "legal_document_template_revision", entityId: revision.revisionId },
      metadata: {
        category: revision.category,
        reasonCode: eligibility.code,
      },
      correlationId: input.correlationId,
    });
    throw new LegalDocumentTemplateError(eligibility.code, "Publish blocked");
  }

  const publishedAt = new Date();
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const template = await LegalDocumentTemplate.findOne({
        templateId: revision.templateId,
      })
        .session(session)
        .lean();
      if (!template) {
        throw new LegalDocumentTemplateError(
          LegalDocumentTemplateErrorCode.UNKNOWN_REVISION,
          "Template missing",
        );
      }

      if (template.latestPublishedRevisionId) {
        await LegalDocumentTemplateRevision.updateOne(
          { revisionId: template.latestPublishedRevisionId },
          {
            $set: { lifecycleStatus: LegalDocumentTemplateRevisionStatus.SUPERSEDED },
          },
          { session },
        );
      }

      const updateResult = await LegalDocumentTemplateRevision.updateOne(
        {
          revisionId: revision.revisionId,
          lifecycleStatus: LegalDocumentTemplateRevisionStatus.DRAFT,
          isCurrentDraft: true,
        },
        {
          $set: {
            lifecycleStatus: LegalDocumentTemplateRevisionStatus.PUBLISHED,
            isCurrentDraft: false,
            publishedAt,
          },
        },
        { session },
      );
      if (updateResult.modifiedCount !== 1) {
        throw new LegalDocumentTemplateError(
          LegalDocumentTemplateErrorCode.REVISION_IMMUTABLE,
          "Publish race or immutable revision",
        );
      }

      await LegalDocumentTemplate.updateOne(
        { templateId: revision.templateId },
        {
          $set: {
            latestPublishedRevisionId: revision.revisionId,
            currentDraftRevisionId: null,
          },
        },
        { session },
      );

      await writeAuditEventMandatory(
        {
          eventType: AuditEventType.LEGAL_DOCUMENT_ONBOARDING_TEMPLATE_REVISION_PUBLISHED,
          actor: buildUserAuditActor(input.context),
          action: "legal_document_template_revision_publish",
          outcome: AuditOutcome.SUCCESS,
          target: { entityType: "legal_document_template_revision", entityId: revision.revisionId },
          metadata: {
            category: revision.category,
            templateId: revision.templateId,
            contentSha256Prefix: revision.contentSha256.slice(0, 16),
            supersededPublishedRevisionId: template.latestPublishedRevisionId ?? null,
          },
          correlationId: input.correlationId,
        },
        { session },
      );
    });
  } finally {
    await session.endSession();
  }

  return { publishedRevisionId: revision.revisionId };
}

/** Guard for future update APIs — published revisions must never be mutated. */
export async function assertLegalDocumentTemplateRevisionMutable(revisionId: string): Promise<void> {
  await connectMongo();
  const revision = await LegalDocumentTemplateRevision.findOne({ revisionId }).lean();
  if (!revision) {
    throw new LegalDocumentTemplateError(
      LegalDocumentTemplateErrorCode.UNKNOWN_REVISION,
      "Unknown revision",
    );
  }
  if (
    revision.lifecycleStatus === LegalDocumentTemplateRevisionStatus.PUBLISHED ||
    revision.lifecycleStatus === LegalDocumentTemplateRevisionStatus.SUPERSEDED
  ) {
    throw new LegalDocumentTemplateError(
      LegalDocumentTemplateErrorCode.REVISION_IMMUTABLE,
      "Published revision",
    );
  }
}
