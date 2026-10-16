import "server-only";

import { randomUUID } from "node:crypto";

import { Types } from "mongoose";

import type { BuildingLegalReadinessResult } from "@/modules/debt-cases/domain/debt-case-legal-readiness";
import { assertLawyerAdminDebtCaseReview } from "@/modules/debt-cases/services/debt-case-authorization.service";
import { getDebtCase } from "@/modules/debt-cases/services/debt-case.service";
import {
  WarningLetterDraftError,
  WarningLetterDraftErrorCode,
} from "@/modules/warning-letters/domain/warning-letter-draft-errors";
import {
  WarningLetterDeliveryChannel,
  type WarningLetterDeliveryChannel as WarningLetterDeliveryChannelType,
} from "@/modules/warning-letters/domain/warning-letter-delivery-channel";
import { WarningLetterDeliveryRecordStatus } from "@/modules/warning-letters/domain/warning-letter-delivery-record-status";
import { WarningLetterDeliveryRecord } from "@/modules/warning-letters/infra/warning-letter-delivery-record.model";
import { collectWarningLetterDispatchBlockersHe } from "@/modules/warning-letters/services/warning-letter-finalization-gates";
import { loadWarningLetterFinalDocumentForCase } from "@/modules/warning-letters/services/warning-letter-finalization.service";
import {
  loadWarningLetterDraftDetailForApprovedCaseReadOnly,
} from "@/modules/warning-letters/services/warning-letter-draft.service";
import { recordWarningLetterDeliveryEvent } from "@/modules/warning-letters/services/warning-letter-lifecycle-audit.service";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import { connectMongo } from "@/shared/db/connect";

export type WarningLetterDeliveryRecordView = {
  deliveryRecordId: string;
  channel: WarningLetterDeliveryChannelType;
  status: string;
  recipientDisplayName: string;
  authorizedAtIso: string;
  attemptRecordedAtIso: string | null;
  trackingReference: string | null;
  evidenceNote: string | null;
};

export async function listWarningLetterDeliveryRecords(
  debtCaseId: string,
): Promise<WarningLetterDeliveryRecordView[]> {
  await connectMongo();
  const rows = await WarningLetterDeliveryRecord.find({ debtCaseId })
    .sort({ authorizedAt: -1 })
    .lean();
  return rows.map((row) => ({
    deliveryRecordId: row.deliveryRecordId,
    channel: row.channel as WarningLetterDeliveryChannelType,
    status: row.status,
    recipientDisplayName: row.recipientDisplayName,
    authorizedAtIso: row.authorizedAt.toISOString(),
    attemptRecordedAtIso: row.attemptRecordedAt?.toISOString() ?? null,
    trackingReference: row.trackingReference ?? null,
    evidenceNote: row.evidenceNote ?? null,
  }));
}

function parseDeliveryChannel(raw: string): WarningLetterDeliveryChannelType | null {
  const values = Object.values(WarningLetterDeliveryChannel) as string[];
  return values.includes(raw) ? (raw as WarningLetterDeliveryChannelType) : null;
}

export async function authorizeWarningLetterDeliveryAttempt(input: {
  context: AuthenticatedContext;
  debtCaseId: string;
  finalDocumentId: string;
  channel: string;
  recipientDisplayName: string;
  recipientContactHint?: string;
  legalReadiness: BuildingLegalReadinessResult;
  correlationId?: string;
}): Promise<WarningLetterDeliveryRecordView> {
  await assertLawyerAdminDebtCaseReview({ context: input.context });
  await connectMongo();

  const channel = parseDeliveryChannel(input.channel);
  if (!channel) {
    throw new WarningLetterDraftError(WarningLetterDraftErrorCode.APPROVAL_BLOCKED, "Invalid channel");
  }
  if (
    channel === WarningLetterDeliveryChannel.SMS_DEFERRED ||
    channel === WarningLetterDeliveryChannel.EMAIL_DEFERRED
  ) {
    throw new WarningLetterDraftError(
      WarningLetterDraftErrorCode.APPROVAL_BLOCKED,
      "Channel integration deferred",
    );
  }

  const debtCase = await getDebtCase({ context: input.context, debtCaseId: input.debtCaseId });
  const detail = await loadWarningLetterDraftDetailForApprovedCaseReadOnly({
    context: input.context,
    debtCaseId: input.debtCaseId,
    debtCaseRecord: debtCase,
  });
  const finalDocument = await loadWarningLetterFinalDocumentForCase(input.debtCaseId);

  const blockers = collectWarningLetterDispatchBlockersHe({
    debtCase,
    legalReadiness: input.legalReadiness,
    loadState: detail.loadState,
    draft: detail.draft,
    legalWordingApprovalStatus: detail.legalWordingApprovalStatus,
    hasFinalDocument: finalDocument != null,
  });

  if (blockers.length > 0) {
    throw new WarningLetterDraftError(
      WarningLetterDraftErrorCode.APPROVAL_BLOCKED,
      blockers.join(" | "),
    );
  }

  if (!finalDocument || finalDocument.finalDocumentId !== input.finalDocumentId) {
    throw new WarningLetterDraftError(
      WarningLetterDraftErrorCode.NOT_FOUND,
      "Final document mismatch",
    );
  }

  const authorizedAt = new Date();
  const deliveryRecordId = randomUUID();
  const status = WarningLetterDeliveryRecordStatus.AUTHORIZED;

  await WarningLetterDeliveryRecord.create({
    deliveryRecordId,
    debtCaseId: input.debtCaseId,
    finalDocumentId: input.finalDocumentId,
    channel,
    status,
    recipientDisplayName: input.recipientDisplayName.trim(),
    recipientContactHint: input.recipientContactHint?.trim() || null,
    authorizedByUserId: new Types.ObjectId(input.context.user.id),
    authorizedAt,
  });

  await recordWarningLetterDeliveryEvent({
    context: input.context,
    deliveryRecordId,
    debtCaseId: input.debtCaseId,
    finalDocumentId: input.finalDocumentId,
    channel,
    status,
    correlationId: input.correlationId,
  });

  return {
    deliveryRecordId,
    channel,
    status,
    recipientDisplayName: input.recipientDisplayName.trim(),
    authorizedAtIso: authorizedAt.toISOString(),
    attemptRecordedAtIso: null,
    trackingReference: null,
    evidenceNote: null,
  };
}

export async function recordWarningLetterDeliveryAttemptDetails(input: {
  context: AuthenticatedContext;
  deliveryRecordId: string;
  trackingReference?: string;
  evidenceNote?: string;
  markFailed?: boolean;
  failureNote?: string;
}): Promise<void> {
  await assertLawyerAdminDebtCaseReview({ context: input.context });
  await connectMongo();

  const row = await WarningLetterDeliveryRecord.findOne({
    deliveryRecordId: input.deliveryRecordId,
  }).lean();
  if (!row) {
    throw new WarningLetterDraftError(WarningLetterDraftErrorCode.NOT_FOUND, "Delivery record missing");
  }

  const now = new Date();
  if (input.markFailed) {
    await WarningLetterDeliveryRecord.updateOne(
      { deliveryRecordId: input.deliveryRecordId },
      {
        $set: {
          status: WarningLetterDeliveryRecordStatus.FAILED,
          failureNote: input.failureNote?.trim() || "נכשל",
          attemptRecordedAt: now,
        },
      },
    );
    return;
  }

  const hasEvidence = Boolean(input.evidenceNote?.trim());
  await WarningLetterDeliveryRecord.updateOne(
    { deliveryRecordId: input.deliveryRecordId },
    {
      $set: {
        status: hasEvidence
          ? WarningLetterDeliveryRecordStatus.EVIDENCE_RECORDED
          : WarningLetterDeliveryRecordStatus.ATTEMPT_RECORDED,
        attemptRecordedAt: now,
        trackingReference: input.trackingReference?.trim() || null,
        evidenceNote: input.evidenceNote?.trim() || null,
        evidenceRecordedAt: hasEvidence ? now : null,
      },
    },
  );
}
