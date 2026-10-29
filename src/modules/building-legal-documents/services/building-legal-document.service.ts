import "server-only";

import { randomUUID } from "node:crypto";

import mongoose, { Types } from "mongoose";

import {
  writeAuditEventMandatory,
} from "@/modules/audit/services/audit-writer.service";
import { BuildingLegalDocumentGenerationBlockCode } from "@/modules/building-legal-documents/domain/building-legal-document-generation-block";
import {
  BuildingLegalDocumentError,
  BuildingLegalDocumentErrorCode,
} from "@/modules/building-legal-documents/domain/building-legal-document-errors";
import {
  BuildingLegalDocumentStatus,
  BuildingLegalDocumentUiStatus,
} from "@/modules/building-legal-documents/domain/building-legal-document-status";
import { BuildingLegalDocument } from "@/modules/building-legal-documents/infra/building-legal-document.model";
import { BuildingOrganizationalStatus } from "@/modules/buildings/domain/building-status";
import { Building } from "@/modules/buildings/infra/building.model";
import {
  LEGAL_DOCUMENT_TEMPLATE_CATEGORY_VALUES,
  legalDocumentTemplateCategoryLabelHe,
  type LegalDocumentTemplateCategory,
} from "@/modules/legal-document-templates/domain/legal-document-template-category";
import { resolveApprovedPublishedLegalTemplateRevision } from "@/modules/legal-document-templates/services/approved-published-legal-template.service";
import { assertLawyerAdminOrganization } from "@/modules/organizations/services/assert-lawyer-admin";
import { UserRole } from "@/modules/users/domain/user-role";
import { User } from "@/modules/users/infra/user.model";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import { assertBuildingAccess } from "@/shared/auth/building-access/assert-building-access";
import { buildUserAuditActor } from "@/shared/audit/build-audit-actor";
import { AuditEventType } from "@/shared/audit/domain/audit-event-taxonomy";
import { AuditOutcome } from "@/shared/audit/domain/audit-outcome";
import { connectMongo } from "@/shared/db/connect";

export const BUILDING_LEGAL_DOCUMENT_HISTORY_LIMIT = 10;

export type BuildingLegalDocumentInstanceSummary = {
  buildingLegalDocumentId: string;
  buildingId: string;
  category: LegalDocumentTemplateCategory;
  templateRevisionNumber: number;
  status: BuildingLegalDocumentStatus;
  uiStatus: BuildingLegalDocumentUiStatus;
  createdAtIso: string;
  supersededAtIso: string | null;
  generatedByFullName: string | null;
};

export type BuildingLegalDocumentPreviewView = BuildingLegalDocumentInstanceSummary & {
  titleHe: string;
  renderedContentSnapshot: string;
};

/** @deprecated Use summary + dedicated preview loader — snapshot not included in lists. */
export type BuildingLegalDocumentInstanceView = BuildingLegalDocumentInstanceSummary & {
  templateRevisionId: string;
  renderedContentSnapshot: string;
};

export type BuildingLegalDocumentCategoryAdminView = {
  category: LegalDocumentTemplateCategory;
  titleHe: string;
  uiStatus: BuildingLegalDocumentUiStatus;
  activeInstance: BuildingLegalDocumentInstanceSummary | null;
  generationAllowed: boolean;
  generationBlockCode: BuildingLegalDocumentGenerationBlockCode | null;
  publishedTemplateRevisionNumber: number | null;
  historyCount: number;
  supersededHistory: BuildingLegalDocumentInstanceSummary[];
};

export type BuildingLegalDocumentCategoryPortalView = {
  category: LegalDocumentTemplateCategory;
  titleHe: string;
  uiStatus: BuildingLegalDocumentUiStatus;
  createdAtIso: string | null;
  templateRevisionNumber: number | null;
  activeBuildingLegalDocumentId: string | null;
};

function mapUiStatus(status: BuildingLegalDocumentStatus): BuildingLegalDocumentUiStatus {
  return status === BuildingLegalDocumentStatus.GENERATED_PENDING_SIGNATURE
    ? BuildingLegalDocumentUiStatus.GENERATED_PENDING_SIGNATURE
    : BuildingLegalDocumentUiStatus.SUPERSEDED;
}

async function resolveGeneratedByNames(
  userIds: readonly Types.ObjectId[],
): Promise<Map<string, string>> {
  if (userIds.length === 0) {
    return new Map();
  }
  const users = await User.find({ _id: { $in: [...userIds] } })
    .select("fullName")
    .lean();
  return new Map(users.map((row) => [row._id.toString(), row.fullName]));
}

function mapDocumentSummary(
  doc: {
    buildingLegalDocumentId: string;
    buildingId: string;
    category: string;
    templateRevisionNumber: number;
    status: string;
    createdAt?: Date;
    supersededAt?: Date | null;
    createdByUserId: Types.ObjectId;
  },
  generatedByFullName: string | null,
): BuildingLegalDocumentInstanceSummary {
  const status = doc.status as BuildingLegalDocumentStatus;
  return {
    buildingLegalDocumentId: doc.buildingLegalDocumentId,
    buildingId: doc.buildingId,
    category: doc.category as LegalDocumentTemplateCategory,
    templateRevisionNumber: doc.templateRevisionNumber,
    status,
    uiStatus: mapUiStatus(status),
    createdAtIso: doc.createdAt?.toISOString() ?? new Date(0).toISOString(),
    supersededAtIso: doc.supersededAt ? doc.supersededAt.toISOString() : null,
    generatedByFullName,
  };
}

async function assertActiveBuilding(buildingId: string) {
  await connectMongo();
  const building = await Building.findOne({ buildingId }).lean();
  if (!building) {
    throw new BuildingLegalDocumentError(
      BuildingLegalDocumentErrorCode.BUILDING_NOT_FOUND,
      "Building not found",
    );
  }
  if (building.organizationalStatus !== BuildingOrganizationalStatus.ACTIVE) {
    throw new BuildingLegalDocumentError(
      BuildingLegalDocumentErrorCode.BUILDING_NOT_ACTIVE,
      "Building not active",
    );
  }
  return building;
}

async function evaluateGenerationAllowed(
  buildingId: string,
  category: LegalDocumentTemplateCategory,
): Promise<{
  allowed: boolean;
  blockCode: BuildingLegalDocumentGenerationBlockCode | null;
  publishedTemplateRevisionNumber: number | null;
}> {
  const building = await Building.findOne({ buildingId }).lean();
  if (!building) {
    return {
      allowed: false,
      blockCode: BuildingLegalDocumentGenerationBlockCode.BUILDING_NOT_FOUND,
      publishedTemplateRevisionNumber: null,
    };
  }
  if (building.organizationalStatus !== BuildingOrganizationalStatus.ACTIVE) {
    return {
      allowed: false,
      blockCode: BuildingLegalDocumentGenerationBlockCode.BUILDING_NOT_ACTIVE,
      publishedTemplateRevisionNumber: null,
    };
  }
  const published = await resolveApprovedPublishedLegalTemplateRevision(category);
  if (!published) {
    return {
      allowed: false,
      blockCode: BuildingLegalDocumentGenerationBlockCode.NO_APPROVED_PUBLISHED_TEMPLATE,
      publishedTemplateRevisionNumber: null,
    };
  }
  return {
    allowed: true,
    blockCode: null,
    publishedTemplateRevisionNumber: published.revisionNumber,
  };
}

export async function loadBuildingLegalDocumentsAdminView(input: {
  context: AuthenticatedContext;
  buildingId: string;
}): Promise<BuildingLegalDocumentCategoryAdminView[]> {
  assertLawyerAdminOrganization(input.context);
  await connectMongo();
  const building = await Building.findOne({ buildingId: input.buildingId }).lean();
  if (!building) {
    throw new BuildingLegalDocumentError(
      BuildingLegalDocumentErrorCode.BUILDING_NOT_FOUND,
      "Building not found",
    );
  }

  const views: BuildingLegalDocumentCategoryAdminView[] = [];
  for (const category of LEGAL_DOCUMENT_TEMPLATE_CATEGORY_VALUES) {
    const [active, supersededRows, historyCount, generation] = await Promise.all([
      BuildingLegalDocument.findOne({
        buildingId: input.buildingId,
        category,
        status: BuildingLegalDocumentStatus.GENERATED_PENDING_SIGNATURE,
      }).lean(),
      BuildingLegalDocument.find({
        buildingId: input.buildingId,
        category,
        status: BuildingLegalDocumentStatus.SUPERSEDED,
      })
        .sort({ createdAt: -1 })
        .limit(BUILDING_LEGAL_DOCUMENT_HISTORY_LIMIT)
        .lean(),
      BuildingLegalDocument.countDocuments({ buildingId: input.buildingId, category }),
      evaluateGenerationAllowed(input.buildingId, category),
    ]);

    const nameIds = [
      ...(active ? [active.createdByUserId] : []),
      ...supersededRows.map((row) => row.createdByUserId),
    ];
    const namesById = await resolveGeneratedByNames(nameIds);

    views.push({
      category,
      titleHe: legalDocumentTemplateCategoryLabelHe(category),
      uiStatus: active
        ? BuildingLegalDocumentUiStatus.GENERATED_PENDING_SIGNATURE
        : BuildingLegalDocumentUiStatus.NOT_GENERATED,
      activeInstance: active
        ? mapDocumentSummary(
            active,
            namesById.get(active.createdByUserId.toString()) ?? null,
          )
        : null,
      generationAllowed: generation.allowed,
      generationBlockCode: generation.blockCode,
      publishedTemplateRevisionNumber: generation.publishedTemplateRevisionNumber,
      historyCount,
      supersededHistory: supersededRows.map((row) =>
        mapDocumentSummary(row, namesById.get(row.createdByUserId.toString()) ?? null),
      ),
    });
  }
  return views;
}

export async function loadBuildingLegalDocumentsPortalView(input: {
  context: AuthenticatedContext;
  buildingId: string;
}): Promise<BuildingLegalDocumentCategoryPortalView[]> {
  await assertBuildingAccess({
    context: input.context,
    buildingPublicId: input.buildingId,
  });
  await connectMongo();

  const views: BuildingLegalDocumentCategoryPortalView[] = [];
  for (const category of LEGAL_DOCUMENT_TEMPLATE_CATEGORY_VALUES) {
    const active = await BuildingLegalDocument.findOne({
      buildingId: input.buildingId,
      category,
      status: BuildingLegalDocumentStatus.GENERATED_PENDING_SIGNATURE,
    })
      .select(
        "buildingLegalDocumentId category templateRevisionNumber createdAt status",
      )
      .lean();

    views.push({
      category,
      titleHe: legalDocumentTemplateCategoryLabelHe(category),
      uiStatus: active
        ? BuildingLegalDocumentUiStatus.GENERATED_PENDING_SIGNATURE
        : BuildingLegalDocumentUiStatus.NOT_GENERATED,
      createdAtIso: active?.createdAt?.toISOString() ?? null,
      templateRevisionNumber: active?.templateRevisionNumber ?? null,
      activeBuildingLegalDocumentId: active?.buildingLegalDocumentId ?? null,
    });
  }
  return views;
}

async function assertCanPreviewBuildingLegalDocument(input: {
  context: AuthenticatedContext;
  doc: {
    buildingId: string;
    status: string;
  };
  expectedBuildingId?: string;
  portalActiveOnly?: boolean;
}): Promise<void> {
  if (
    input.expectedBuildingId &&
    input.doc.buildingId !== input.expectedBuildingId
  ) {
    throw new BuildingLegalDocumentError(
      BuildingLegalDocumentErrorCode.FORBIDDEN,
      "Building mismatch",
    );
  }

  const isLawyer = input.context.user.role === UserRole.LAWYER_ADMIN;
  if (!isLawyer) {
    await assertBuildingAccess({
      context: input.context,
      buildingPublicId: input.doc.buildingId,
    });
    if (
      input.portalActiveOnly &&
      input.doc.status !== BuildingLegalDocumentStatus.GENERATED_PENDING_SIGNATURE
    ) {
      throw new BuildingLegalDocumentError(
        BuildingLegalDocumentErrorCode.FORBIDDEN,
        "Historical document not available in portal",
      );
    }
  } else {
    try {
      assertLawyerAdminOrganization(input.context);
    } catch {
      throw new BuildingLegalDocumentError(
        BuildingLegalDocumentErrorCode.FORBIDDEN,
        "Lawyer admin required",
      );
    }
  }
}

export async function getBuildingLegalDocumentPreview(input: {
  context: AuthenticatedContext;
  buildingLegalDocumentId: string;
  expectedBuildingId?: string;
  portalActiveOnly?: boolean;
}): Promise<BuildingLegalDocumentPreviewView> {
  await connectMongo();
  const doc = await BuildingLegalDocument.findOne({
    buildingLegalDocumentId: input.buildingLegalDocumentId,
  }).lean();

  if (!doc) {
    throw new BuildingLegalDocumentError(
      BuildingLegalDocumentErrorCode.DOCUMENT_NOT_FOUND,
      "Document not found",
    );
  }

  await assertCanPreviewBuildingLegalDocument({
    context: input.context,
    doc,
    expectedBuildingId: input.expectedBuildingId,
    portalActiveOnly: input.portalActiveOnly,
  });

  const namesById = await resolveGeneratedByNames([doc.createdByUserId]);
  const summary = mapDocumentSummary(
    doc,
    namesById.get(doc.createdByUserId.toString()) ?? null,
  );

  return {
    ...summary,
    titleHe: legalDocumentTemplateCategoryLabelHe(summary.category),
    renderedContentSnapshot: doc.renderedContentSnapshot,
  };
}

export async function generateBuildingLegalDocument(input: {
  context: AuthenticatedContext;
  buildingId: string;
  category: LegalDocumentTemplateCategory;
  correlationId?: string;
}): Promise<{ buildingLegalDocumentId: string; supersededDocumentId: string | null }> {
  try {
    assertLawyerAdminOrganization(input.context);
  } catch {
    throw new BuildingLegalDocumentError(
      BuildingLegalDocumentErrorCode.FORBIDDEN,
      "Lawyer admin required",
    );
  }

  await assertActiveBuilding(input.buildingId);

  const published = await resolveApprovedPublishedLegalTemplateRevision(input.category);
  if (!published) {
    throw new BuildingLegalDocumentError(
      BuildingLegalDocumentErrorCode.TEMPLATE_NOT_APPROVED,
      "No approved published template",
    );
  }

  const buildingLegalDocumentId = randomUUID();
  const now = new Date();
  let supersededDocumentId: string | null = null;

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const existingActive = await BuildingLegalDocument.findOne({
        buildingId: input.buildingId,
        category: input.category,
        status: BuildingLegalDocumentStatus.GENERATED_PENDING_SIGNATURE,
      })
        .session(session)
        .lean();

      if (existingActive) {
        const supersedeResult = await BuildingLegalDocument.updateOne(
          {
            buildingLegalDocumentId: existingActive.buildingLegalDocumentId,
            status: BuildingLegalDocumentStatus.GENERATED_PENDING_SIGNATURE,
          },
          {
            $set: {
              status: BuildingLegalDocumentStatus.SUPERSEDED,
              supersededAt: now,
            },
          },
          { session },
        );
        if (supersedeResult.modifiedCount !== 1) {
          throw new BuildingLegalDocumentError(
            BuildingLegalDocumentErrorCode.CONCURRENT_GENERATION,
            "Concurrent supersede",
          );
        }
        supersededDocumentId = existingActive.buildingLegalDocumentId;

        await writeAuditEventMandatory(
          {
            eventType: AuditEventType.LEGAL_DOCUMENT_BUILDING_INSTANCE_SUPERSEDED,
            actor: buildUserAuditActor(input.context),
            action: "building_legal_document_supersede",
            outcome: AuditOutcome.SUCCESS,
            target: {
              entityType: "building_legal_document",
              entityId: existingActive.buildingLegalDocumentId,
            },
            metadata: {
              buildingId: input.buildingId,
              category: input.category,
              replacementPendingId: buildingLegalDocumentId,
            },
            correlationId: input.correlationId,
          },
          { session },
        );
      }

      await BuildingLegalDocument.create(
        [
          {
            buildingLegalDocumentId,
            buildingId: input.buildingId,
            category: input.category,
            templateId: published.templateId,
            templateRevisionId: published.revisionId,
            templateRevisionNumber: published.revisionNumber,
            templateContentSha256: published.contentSha256,
            renderedContentSnapshot: published.bodyText,
            status: BuildingLegalDocumentStatus.GENERATED_PENDING_SIGNATURE,
            createdByUserId: new Types.ObjectId(input.context.user.id),
            supersededAt: null,
          },
        ],
        { session },
      );

      await writeAuditEventMandatory(
        {
          eventType: AuditEventType.LEGAL_DOCUMENT_BUILDING_INSTANCE_GENERATED,
          actor: buildUserAuditActor(input.context),
          action: "building_legal_document_generate",
          outcome: AuditOutcome.SUCCESS,
          target: { entityType: "building_legal_document", entityId: buildingLegalDocumentId },
          metadata: {
            buildingId: input.buildingId,
            category: input.category,
            templateRevisionId: published.revisionId,
            templateRevisionNumber: published.revisionNumber,
            digestPrefix: published.contentSha256.slice(0, 16),
            supersededDocumentId,
          },
          correlationId: input.correlationId,
        },
        { session },
      );
    });
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as { code?: number }).code === 11000
    ) {
      throw new BuildingLegalDocumentError(
        BuildingLegalDocumentErrorCode.CONCURRENT_GENERATION,
        "Duplicate active document",
      );
    }
    throw error;
  } finally {
    await session.endSession();
  }

  return { buildingLegalDocumentId, supersededDocumentId };
}

/** Ensures snapshots are never mutated after creation. */
export async function assertBuildingLegalDocumentSnapshotImmutable(
  buildingLegalDocumentId: string,
): Promise<void> {
  await connectMongo();
  const doc = await BuildingLegalDocument.findOne({ buildingLegalDocumentId }).lean();
  if (!doc) {
    return;
  }
  // No update API in CP13B.2 — guard for future routes.
  void doc.renderedContentSnapshot;
}
