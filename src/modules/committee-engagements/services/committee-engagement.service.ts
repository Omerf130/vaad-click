import "server-only";

import { randomUUID } from "node:crypto";

import mongoose, { Types } from "mongoose";

import { BankAccountCollectionStatus } from "@/modules/committee-engagements/domain/bank-account-collection-status";
import {
  CommitteeEngagementError,
  CommitteeEngagementErrorCode,
} from "@/modules/committee-engagements/domain/engagement-errors";
import { CommitteeEngagementStatus } from "@/modules/committee-engagements/domain/engagement-status";
import { CommitteeEngagement } from "@/modules/committee-engagements/infra/committee-engagement.model";
import { BuildingOrganizationalStatus } from "@/modules/buildings/domain/building-status";
import { Building } from "@/modules/buildings/infra/building.model";
import type { FinancialSettingsSnapshot } from "@/modules/financial-settings/domain/financial-settings-snapshot";
import { publishedVersionSupportsProposedEngagementTerms } from "@/modules/financial-settings/domain/published-financial-settings-version";
import { resolveApplicableFinancialSettingsVersion } from "@/modules/financial-settings/services/financial-settings-query.service";
import { materializeFinancialSettingsSnapshot } from "@/modules/financial-settings/services/financial-settings-snapshot.service";
import { assertLawyerAdminOrganization } from "@/modules/organizations/services/assert-lawyer-admin";
import {
  recordCommitteeEngagementProposedTermsCaptured,
  recordCommitteeEngagementProposedTermsReplaced,
} from "@/modules/organizations/services/organization-audit.service";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import { AuditWriteFailedError } from "@/shared/audit/errors/audit-errors";
import { connectMongo } from "@/shared/db/connect";

function mapAuditError(error: unknown): never {
  if (error instanceof AuditWriteFailedError) {
    throw new CommitteeEngagementError(
      CommitteeEngagementErrorCode.AUDIT_PERSISTENCE,
      "Engagement change could not be recorded",
    );
  }
  throw error;
}

export type AdminCommitteeEngagementView = {
  engagementId: string;
  buildingId: string;
  status: CommitteeEngagementStatus;
  isSigned: false;
  sourceSettingsVersionId: string;
  sourceVersionNumber: number;
  proposedTermsCapturedAtIso: string;
  outboundTransfersAllowed: false;
  bankAccountCollectionStatus: BankAccountCollectionStatus;
  proposedTerms: FinancialSettingsSnapshot;
};

export async function getAdminCommitteeEngagementForBuilding(input: {
  context: AuthenticatedContext;
  buildingId: string;
}): Promise<AdminCommitteeEngagementView | null> {
  assertLawyerAdminOrganization(input.context);
  await connectMongo();

  const row = await CommitteeEngagement.findOne({
    buildingId: input.buildingId,
    status: CommitteeEngagementStatus.PROPOSED_TERMS,
    signedAt: null,
  }).lean();

  if (!row?.proposedTermsSnapshot?.payload) {
    return null;
  }

  return {
    engagementId: row.engagementId,
    buildingId: row.buildingId,
    status: row.status as CommitteeEngagementStatus,
    isSigned: false,
    sourceSettingsVersionId: row.sourceSettingsVersionId,
    sourceVersionNumber: row.sourceVersionNumber,
    proposedTermsCapturedAtIso: row.proposedTermsCapturedAt.toISOString(),
    outboundTransfersAllowed: false,
    bankAccountCollectionStatus: row.bankAccountCollectionStatus as BankAccountCollectionStatus,
    proposedTerms: row.proposedTermsSnapshot.payload as unknown as FinancialSettingsSnapshot,
  };
}

export async function captureOrReplaceProposedCommitteeTerms(input: {
  context: AuthenticatedContext;
  buildingId: string;
  correlationId?: string;
}): Promise<{ engagementId: string; replaced: boolean }> {
  assertLawyerAdminOrganization(input.context);

  const building = await Building.findOne({
    buildingId: input.buildingId,
    organizationalStatus: BuildingOrganizationalStatus.ACTIVE,
  }).lean();

  if (!building) {
    throw new CommitteeEngagementError(CommitteeEngagementErrorCode.NOT_FOUND, "Building not found");
  }

  const asOf = new Date();
  const published = await resolveApplicableFinancialSettingsVersion({
    context: input.context,
    asOf,
  });

  if (!published) {
    throw new CommitteeEngagementError(
      CommitteeEngagementErrorCode.FINANCIAL_VERSION_INCOMPLETE,
      "No applicable published financial settings version",
    );
  }

  if (!publishedVersionSupportsProposedEngagementTerms(published)) {
    throw new CommitteeEngagementError(
      CommitteeEngagementErrorCode.FINANCIAL_VERSION_INCOMPLETE,
      "Applicable financial settings version lacks platform fee configuration",
    );
  }

  const snapshot = materializeFinancialSettingsSnapshot(published, asOf);
  const snapshotEnvelope = { payload: snapshot };

  await connectMongo();
  const session = await mongoose.startSession();
  let engagementId = "";
  let replaced = false;

  try {
    await session.withTransaction(async () => {
      const existing = await CommitteeEngagement.findOne({
        buildingId: input.buildingId,
        signedAt: null,
        status: CommitteeEngagementStatus.PROPOSED_TERMS,
      })
        .session(session)
        .lean();

      if (existing?.signedAt) {
        throw new CommitteeEngagementError(
          CommitteeEngagementErrorCode.ALREADY_SIGNED,
          "Signed engagement terms cannot be replaced",
        );
      }

      const now = new Date();
      const actorId = new Types.ObjectId(input.context.user.id);

      if (existing) {
        replaced = true;
        engagementId = existing.engagementId;
        await CommitteeEngagement.updateOne(
          { _id: existing._id, signedAt: null },
          {
            $set: {
              proposedTermsSnapshot: snapshotEnvelope,
              sourceSettingsVersionId: published.settingsVersionId,
              sourceVersionNumber: published.versionNumber,
              proposedTermsCapturedAt: now,
              proposedTermsCapturedByUserId: actorId,
              outboundTransfersAllowed: false,
            },
          },
          { session },
        );

        await recordCommitteeEngagementProposedTermsReplaced({
          context: input.context,
          buildingId: input.buildingId,
          engagementId,
          settingsVersionId: published.settingsVersionId,
          correlationId: input.correlationId,
          session,
        });
      } else {
        engagementId = randomUUID();
        await CommitteeEngagement.create(
          [
            {
              engagementId,
              buildingId: input.buildingId,
              status: CommitteeEngagementStatus.PROPOSED_TERMS,
              proposedTermsSnapshot: snapshotEnvelope,
              signedTermsSnapshot: null,
              signedAt: null,
              signedByUserId: null,
              sourceSettingsVersionId: published.settingsVersionId,
              sourceVersionNumber: published.versionNumber,
              proposedTermsCapturedAt: now,
              proposedTermsCapturedByUserId: actorId,
              bankAccountCollectionStatus: BankAccountCollectionStatus.NOT_COLLECTED,
              outboundTransfersAllowed: false,
              createdByUserId: actorId,
            },
          ],
          { session },
        );

        await recordCommitteeEngagementProposedTermsCaptured({
          context: input.context,
          buildingId: input.buildingId,
          engagementId,
          settingsVersionId: published.settingsVersionId,
          correlationId: input.correlationId,
          session,
        });
      }
    });
  } catch (error) {
    mapAuditError(error);
  } finally {
    await session.endSession();
  }

  return { engagementId, replaced };
}
