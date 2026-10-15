import "server-only";

import type { ClientSession } from "mongoose";

import { writeAuditEventMandatory } from "@/modules/audit/services/audit-writer.service";
import type { DebtCaseLawyerReviewStatus } from "@/modules/debt-cases/domain/debt-case-lawyer-review-status";
import type { DebtCaseValidationFlagCode } from "@/modules/debt-cases/domain/debt-case-validation-flag";
import {
  DebtCaseWorkflowStatus,
  type DebtCaseWorkflowStatus as DebtCaseWorkflowStatusType,
} from "@/modules/debt-cases/domain/debt-case-workflow-status";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import { buildUserAuditActor } from "@/shared/audit/build-audit-actor";
import { AuditEventType } from "@/shared/audit/domain/audit-event-taxonomy";
import { AuditOutcome } from "@/shared/audit/domain/audit-outcome";

type DebtCaseAuditBase = {
  context: AuthenticatedContext;
  debtCaseId: string;
  buildingId: string;
  revision: number;
  correlationId?: string;
  session: ClientSession;
};

function safeDebtCaseMetadata(input: {
  buildingId: string;
  workflowStatus?: DebtCaseWorkflowStatusType;
  lawyerReviewStatus?: DebtCaseLawyerReviewStatus;
  validationFlagCodes?: readonly DebtCaseValidationFlagCode[];
  revision: number;
  reviewCommentHe?: string;
}) {
  return {
    buildingId: input.buildingId,
    ...(input.workflowStatus ? { workflowStatus: input.workflowStatus } : {}),
    ...(input.lawyerReviewStatus ? { lawyerReviewStatus: input.lawyerReviewStatus } : {}),
    ...(input.validationFlagCodes?.length
      ? { validationFlagCodes: input.validationFlagCodes.join(",") }
      : {}),
    ...(input.reviewCommentHe ? { reviewCommentHe: input.reviewCommentHe } : {}),
    revision: input.revision,
  };
}

export async function recordDebtCaseDraftCreated(input: DebtCaseAuditBase): Promise<void> {
  await writeAuditEventMandatory(
    {
      eventType: AuditEventType.DEBT_CASE_DRAFT_CREATED,
      actor: buildUserAuditActor(input.context),
      action: "debt_case_draft_create",
      outcome: AuditOutcome.SUCCESS,
      target: { entityType: "debt_case", entityId: input.debtCaseId },
      metadata: safeDebtCaseMetadata({
        buildingId: input.buildingId,
        workflowStatus: DebtCaseWorkflowStatus.DRAFT,
        revision: input.revision,
      }),
      correlationId: input.correlationId,
    },
    { session: input.session },
  );
}

export async function recordDebtCaseDraftUpdated(
  input: DebtCaseAuditBase & {
    workflowStatus: DebtCaseWorkflowStatus;
    lawyerReviewStatus: DebtCaseLawyerReviewStatus;
    validationFlagCodes?: readonly DebtCaseValidationFlagCode[];
  },
): Promise<void> {
  await writeAuditEventMandatory(
    {
      eventType: AuditEventType.DEBT_CASE_DRAFT_UPDATED,
      actor: buildUserAuditActor(input.context),
      action: "debt_case_draft_update",
      outcome: AuditOutcome.SUCCESS,
      target: { entityType: "debt_case", entityId: input.debtCaseId },
      metadata: safeDebtCaseMetadata({
        buildingId: input.buildingId,
        workflowStatus: input.workflowStatus,
        lawyerReviewStatus: input.lawyerReviewStatus,
        validationFlagCodes: input.validationFlagCodes,
        revision: input.revision,
      }),
      correlationId: input.correlationId,
    },
    { session: input.session },
  );
}

export async function recordDebtCaseSubmitted(
  input: DebtCaseAuditBase & {
    lawyerReviewStatus: DebtCaseLawyerReviewStatus;
    validationFlagCodes?: readonly DebtCaseValidationFlagCode[];
  },
): Promise<void> {
  await writeAuditEventMandatory(
    {
      eventType: AuditEventType.DEBT_CASE_SUBMITTED,
      actor: buildUserAuditActor(input.context),
      action: "debt_case_submit",
      outcome: AuditOutcome.SUCCESS,
      target: { entityType: "debt_case", entityId: input.debtCaseId },
      metadata: safeDebtCaseMetadata({
        buildingId: input.buildingId,
        workflowStatus: DebtCaseWorkflowStatus.AWAITING_LAWYER_REVIEW,
        lawyerReviewStatus: input.lawyerReviewStatus,
        validationFlagCodes: input.validationFlagCodes,
        revision: input.revision,
      }),
      correlationId: input.correlationId,
    },
    { session: input.session },
  );
}

export async function recordDebtCaseReturned(
  input: DebtCaseAuditBase & {
    lawyerReviewStatus: DebtCaseLawyerReviewStatus;
    reviewCommentHe?: string;
  },
): Promise<void> {
  await writeAuditEventMandatory(
    {
      eventType: AuditEventType.DEBT_CASE_RETURNED,
      actor: buildUserAuditActor(input.context),
      action: "debt_case_return",
      outcome: AuditOutcome.SUCCESS,
      target: { entityType: "debt_case", entityId: input.debtCaseId },
      metadata: safeDebtCaseMetadata({
        buildingId: input.buildingId,
        workflowStatus: DebtCaseWorkflowStatus.RETURNED_FOR_COMPLETION,
        lawyerReviewStatus: input.lawyerReviewStatus,
        reviewCommentHe: input.reviewCommentHe,
        revision: input.revision,
      }),
      correlationId: input.correlationId,
    },
    { session: input.session },
  );
}

export async function recordDebtCaseRejected(
  input: DebtCaseAuditBase & {
    lawyerReviewStatus: DebtCaseLawyerReviewStatus;
    reviewCommentHe: string;
  },
): Promise<void> {
  await writeAuditEventMandatory(
    {
      eventType: AuditEventType.DEBT_CASE_REJECTED,
      actor: buildUserAuditActor(input.context),
      action: "debt_case_reject",
      outcome: AuditOutcome.SUCCESS,
      target: { entityType: "debt_case", entityId: input.debtCaseId },
      metadata: safeDebtCaseMetadata({
        buildingId: input.buildingId,
        workflowStatus: DebtCaseWorkflowStatus.REJECTED,
        lawyerReviewStatus: input.lawyerReviewStatus,
        reviewCommentHe: input.reviewCommentHe,
        revision: input.revision,
      }),
      correlationId: input.correlationId,
    },
    { session: input.session },
  );
}

export async function recordDebtCaseApprovedForLetterPrep(
  input: DebtCaseAuditBase & {
    lawyerReviewStatus: DebtCaseLawyerReviewStatus;
    validationFlagCodes?: readonly DebtCaseValidationFlagCode[];
  },
): Promise<void> {
  await writeAuditEventMandatory(
    {
      eventType: AuditEventType.DEBT_CASE_APPROVED_FOR_LETTER_PREP,
      actor: buildUserAuditActor(input.context),
      action: "debt_case_approve_letter_prep",
      outcome: AuditOutcome.SUCCESS,
      target: { entityType: "debt_case", entityId: input.debtCaseId },
      metadata: safeDebtCaseMetadata({
        buildingId: input.buildingId,
        workflowStatus: DebtCaseWorkflowStatus.AWAITING_LAWYER_REVIEW,
        lawyerReviewStatus: input.lawyerReviewStatus,
        validationFlagCodes: input.validationFlagCodes,
        revision: input.revision,
      }),
      correlationId: input.correlationId,
    },
    { session: input.session },
  );
}

export async function recordDebtCaseReviewInvalidatedByEdit(
  input: DebtCaseAuditBase & { lawyerReviewStatus: DebtCaseLawyerReviewStatus },
): Promise<void> {
  await writeAuditEventMandatory(
    {
      eventType: AuditEventType.DEBT_CASE_REVIEW_INVALIDATED_BY_EDIT,
      actor: buildUserAuditActor(input.context),
      action: "debt_case_review_invalidated",
      outcome: AuditOutcome.SUCCESS,
      target: { entityType: "debt_case", entityId: input.debtCaseId },
      metadata: safeDebtCaseMetadata({
        buildingId: input.buildingId,
        workflowStatus: DebtCaseWorkflowStatus.AWAITING_LAWYER_REVIEW,
        lawyerReviewStatus: input.lawyerReviewStatus,
        revision: input.revision,
      }),
      correlationId: input.correlationId,
    },
    { session: input.session },
  );
}
