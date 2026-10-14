import "server-only";

import type { ClientSession } from "mongoose";

import { writeAuditEventMandatory } from "@/modules/audit/services/audit-writer.service";
import { AuditEventType } from "@/shared/audit/domain/audit-event-taxonomy";
import { AuditOutcome } from "@/shared/audit/domain/audit-outcome";
import { buildUserAuditActor } from "@/shared/audit/build-audit-actor";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";

type AuditBase = {
  context: AuthenticatedContext;
  correlationId?: string;
  session: ClientSession;
};

export async function recordAccountApproved(input: AuditBase & { targetUserId: string }) {
  await writeAuditEventMandatory(
    {
      eventType: AuditEventType.USER_ADMIN_ACCOUNT_APPROVED,
      actor: buildUserAuditActor(input.context),
      action: "approve_account",
      outcome: AuditOutcome.SUCCESS,
      target: { entityType: "user", entityId: input.targetUserId },
      correlationId: input.correlationId,
    },
    { session: input.session },
  );
}

export async function recordAccountRejected(input: AuditBase & { targetUserId: string }) {
  await writeAuditEventMandatory(
    {
      eventType: AuditEventType.USER_ADMIN_ACCOUNT_REJECTED,
      actor: buildUserAuditActor(input.context),
      action: "reject_account",
      outcome: AuditOutcome.SUCCESS,
      target: { entityType: "user", entityId: input.targetUserId },
      correlationId: input.correlationId,
    },
    { session: input.session },
  );
}

export async function recordAccountReconsidered(input: AuditBase & { targetUserId: string }) {
  await writeAuditEventMandatory(
    {
      eventType: AuditEventType.USER_ADMIN_ACCOUNT_RECONSIDERED,
      actor: buildUserAuditActor(input.context),
      action: "reconsider_account",
      outcome: AuditOutcome.SUCCESS,
      target: { entityType: "user", entityId: input.targetUserId },
      correlationId: input.correlationId,
    },
    { session: input.session },
  );
}

export async function recordBuildingUpdated(input: AuditBase & { buildingId: string }) {
  await writeAuditEventMandatory(
    {
      eventType: AuditEventType.BUILDING_RECORD_UPDATED,
      actor: buildUserAuditActor(input.context),
      action: "update_building",
      outcome: AuditOutcome.SUCCESS,
      target: { entityType: "building", entityId: input.buildingId },
      correlationId: input.correlationId,
    },
    { session: input.session },
  );
}

export async function recordBuildingArchived(input: AuditBase & { buildingId: string }) {
  await writeAuditEventMandatory(
    {
      eventType: AuditEventType.BUILDING_RECORD_ARCHIVED,
      actor: buildUserAuditActor(input.context),
      action: "archive_building",
      outcome: AuditOutcome.SUCCESS,
      target: { entityType: "building", entityId: input.buildingId },
      correlationId: input.correlationId,
    },
    { session: input.session },
  );
}

export async function recordBuildingCreated(input: AuditBase & { buildingId: string }) {
  await writeAuditEventMandatory(
    {
      eventType: AuditEventType.BUILDING_RECORD_CREATED,
      actor: buildUserAuditActor(input.context),
      action: "create_building",
      outcome: AuditOutcome.SUCCESS,
      target: { entityType: "building", entityId: input.buildingId },
      correlationId: input.correlationId,
    },
    { session: input.session },
  );
}

export async function recordDuplicateAddressException(
  input: AuditBase & { buildingId: string; normalizedAddressKey: string },
) {
  await writeAuditEventMandatory(
    {
      eventType: AuditEventType.BUILDING_DUPLICATE_ADDRESS_EXCEPTION,
      actor: buildUserAuditActor(input.context),
      action: "duplicate_address_exception",
      outcome: AuditOutcome.SUCCESS,
      target: { entityType: "building", entityId: input.buildingId },
      metadata: { normalizedAddressKey: input.normalizedAddressKey },
      correlationId: input.correlationId,
    },
    { session: input.session },
  );
}

export async function recordRepresentativeAssigned(
  input: AuditBase & {
    buildingId: string;
    representativeUserId: string;
    previousRepresentativeUserId?: string;
  },
) {
  await writeAuditEventMandatory(
    {
      eventType: input.previousRepresentativeUserId
        ? AuditEventType.BUILDING_REPRESENTATIVE_REPLACED
        : AuditEventType.BUILDING_REPRESENTATIVE_ASSIGNED,
      actor: buildUserAuditActor(input.context),
      action: "assign_representative",
      outcome: AuditOutcome.SUCCESS,
      target: { entityType: "building", entityId: input.buildingId },
      metadata: {
        representativeUserId: input.representativeUserId,
        ...(input.previousRepresentativeUserId
          ? { previousRepresentativeUserId: input.previousRepresentativeUserId }
          : {}),
      },
      correlationId: input.correlationId,
    },
    { session: input.session },
  );
}

export async function recordRepresentativeRemoved(
  input: AuditBase & { buildingId: string; representativeUserId: string },
) {
  await writeAuditEventMandatory(
    {
      eventType: AuditEventType.BUILDING_REPRESENTATIVE_REMOVED,
      actor: buildUserAuditActor(input.context),
      action: "remove_representative",
      outcome: AuditOutcome.SUCCESS,
      target: { entityType: "building", entityId: input.buildingId },
      metadata: { representativeUserId: input.representativeUserId },
      correlationId: input.correlationId,
    },
    { session: input.session },
  );
}

export async function recordManagementCompanyUnlinked(
  input: AuditBase & { buildingId: string; managementCompanyId: string },
) {
  await writeAuditEventMandatory(
    {
      eventType: AuditEventType.BUILDING_MANAGEMENT_COMPANY_UNLINKED,
      actor: buildUserAuditActor(input.context),
      action: "unlink_management_company",
      outcome: AuditOutcome.SUCCESS,
      target: { entityType: "building", entityId: input.buildingId },
      metadata: { managementCompanyId: input.managementCompanyId },
      correlationId: input.correlationId,
    },
    { session: input.session },
  );
}

export async function recordManagementCompanyLinked(
  input: AuditBase & { buildingId: string; managementCompanyId: string },
) {
  await writeAuditEventMandatory(
    {
      eventType: AuditEventType.BUILDING_MANAGEMENT_COMPANY_LINKED,
      actor: buildUserAuditActor(input.context),
      action: "link_management_company",
      outcome: AuditOutcome.SUCCESS,
      target: { entityType: "building", entityId: input.buildingId },
      metadata: { managementCompanyId: input.managementCompanyId },
      correlationId: input.correlationId,
    },
    { session: input.session },
  );
}

export async function recordManagementCompanyUpdated(
  input: AuditBase & { managementCompanyId: string },
) {
  await writeAuditEventMandatory(
    {
      eventType: AuditEventType.MANAGEMENT_COMPANY_RECORD_UPDATED,
      actor: buildUserAuditActor(input.context),
      action: "update_management_company",
      outcome: AuditOutcome.SUCCESS,
      target: { entityType: "management_company", entityId: input.managementCompanyId },
      correlationId: input.correlationId,
    },
    { session: input.session },
  );
}

export async function recordManagementCompanyRecordCreated(
  input: AuditBase & { managementCompanyId: string },
) {
  await writeAuditEventMandatory(
    {
      eventType: AuditEventType.MANAGEMENT_COMPANY_RECORD_CREATED,
      actor: buildUserAuditActor(input.context),
      action: "create_management_company",
      outcome: AuditOutcome.SUCCESS,
      target: { entityType: "management_company", entityId: input.managementCompanyId },
      correlationId: input.correlationId,
    },
    { session: input.session },
  );
}

export async function recordManagementCompanyPrimaryUserLinked(
  input: AuditBase & { managementCompanyId: string; primaryUserId: string },
) {
  await writeAuditEventMandatory(
    {
      eventType: AuditEventType.MANAGEMENT_COMPANY_PRIMARY_USER_LINKED,
      actor: buildUserAuditActor(input.context),
      action: "link_primary_user",
      outcome: AuditOutcome.SUCCESS,
      target: { entityType: "management_company", entityId: input.managementCompanyId },
      metadata: { primaryUserId: input.primaryUserId },
      correlationId: input.correlationId,
    },
    { session: input.session },
  );
}

export async function recordCommitteeEngagementProposedTermsCaptured(
  input: AuditBase & { buildingId: string; engagementId: string; settingsVersionId: string },
) {
  await writeAuditEventMandatory(
    {
      eventType: AuditEventType.BUILDING_COMMITTEE_ENGAGEMENT_PROPOSED_TERMS_CAPTURED,
      actor: buildUserAuditActor(input.context),
      action: "capture_proposed_committee_terms",
      outcome: AuditOutcome.SUCCESS,
      target: { entityType: "building", entityId: input.buildingId },
      metadata: {
        engagementId: input.engagementId,
        settingsVersionId: input.settingsVersionId,
      },
      correlationId: input.correlationId,
    },
    { session: input.session },
  );
}

export async function recordCommitteeEngagementProposedTermsReplaced(
  input: AuditBase & { buildingId: string; engagementId: string; settingsVersionId: string },
) {
  await writeAuditEventMandatory(
    {
      eventType: AuditEventType.BUILDING_COMMITTEE_ENGAGEMENT_PROPOSED_TERMS_REPLACED,
      actor: buildUserAuditActor(input.context),
      action: "replace_proposed_committee_terms",
      outcome: AuditOutcome.SUCCESS,
      target: { entityType: "building", entityId: input.buildingId },
      metadata: {
        engagementId: input.engagementId,
        settingsVersionId: input.settingsVersionId,
      },
      correlationId: input.correlationId,
    },
    { session: input.session },
  );
}
