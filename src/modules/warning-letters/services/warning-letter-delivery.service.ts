import "server-only";

import { randomUUID } from "node:crypto";

import { Types } from "mongoose";

import { applyDebtCaseLetterSentTransition } from "@/modules/debt-cases/services/debt-case-letter-sent.service";
import { assertLawyerAdminDebtCaseReview } from "@/modules/debt-cases/services/debt-case-authorization.service";
import { getDebtCase } from "@/modules/debt-cases/services/debt-case.service";
import { DocumentAsset } from "@/modules/document-assets/infra/document-asset.model";
import {
  WarningLetterDraftError,
  WarningLetterDraftErrorCode,
} from "@/modules/warning-letters/domain/warning-letter-draft-errors";
import {
  type WarningLetterDeliveryChannel as WarningLetterDeliveryChannelType,
  isManualWarningLetterDeliveryChannel,
  WARNING_LETTER_MANUAL_DELIVERY_CHANNELS,
} from "@/modules/warning-letters/domain/warning-letter-delivery-channel";
import {
  WarningLetterDeliveryRecordStatus,
  deliveryStatusTriggersCaseLetterSent,
  formatWarningLetterDeliveryRecordStatusHe,
} from "@/modules/warning-letters/domain/warning-letter-delivery-record-status";
import { WarningLetterDeliveryRecord } from "@/modules/warning-letters/infra/warning-letter-delivery-record.model";
import { collectWarningLetterManualDeliveryBlockersHe } from "@/modules/warning-letters/services/warning-letter-finalization-gates";
import { loadWarningLetterFinalDocumentForCase } from "@/modules/warning-letters/services/warning-letter-finalization.service";
import {
  recordWarningLetterDeliveryConfirmedEvent,
  recordWarningLetterDeliveryEvent,
} from "@/modules/warning-letters/services/warning-letter-lifecycle-audit.service";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import { connectMongo } from "@/shared/db/connect";
import { UserRole } from "@/modules/users/domain/user-role";

export type WarningLetterDeliveryRecordView = {
  deliveryRecordId: string;
  channel: WarningLetterDeliveryChannelType;
  status: string;
  statusHe: string;
  recipientDisplayName: string;
  recipientContactHint: string | null;
  sentAtIso: string | null;
  confirmedDeliveredAtIso: string | null;
  recordedAtIso: string;
  trackingReference: string | null;
  internalNotes: string | null;
  evidenceDocumentAssetId: string | null;
  failureNote: string | null;
};

function mapDeliveryRow(row: {
  deliveryRecordId: string;
  channel: string;
  status: string;
  recipientDisplayName: string;
  recipientContactHint?: string | null;
  sentAt?: Date | null;
  authorizedAt: Date;
  confirmedDeliveredAt?: Date | null;
  attemptRecordedAt?: Date | null;
  trackingReference?: string | null;
  internalNotes?: string | null;
  evidenceDocumentAssetId?: string | null;
  evidenceNote?: string | null;
  failureNote?: string | null;
}): WarningLetterDeliveryRecordView {
  const sentAt = row.sentAt ?? row.attemptRecordedAt ?? null;
  return {
    deliveryRecordId: row.deliveryRecordId,
    channel: row.channel as WarningLetterDeliveryChannelType,
    status: row.status,
    statusHe: formatWarningLetterDeliveryRecordStatusHe(row.status),
    recipientDisplayName: row.recipientDisplayName,
    recipientContactHint: row.recipientContactHint ?? null,
    sentAtIso: sentAt ? sentAt.toISOString() : null,
    confirmedDeliveredAtIso: row.confirmedDeliveredAt?.toISOString() ?? null,
    recordedAtIso: row.authorizedAt.toISOString(),
    trackingReference: row.trackingReference ?? null,
    internalNotes: row.internalNotes?.trim() || row.evidenceNote?.trim() || null,
    evidenceDocumentAssetId: row.evidenceDocumentAssetId ?? null,
    failureNote: row.failureNote ?? null,
  };
}

export async function listWarningLetterDeliveryRecords(
  debtCaseId: string,
): Promise<WarningLetterDeliveryRecordView[]> {
  await connectMongo();
  const rows = await WarningLetterDeliveryRecord.find({ debtCaseId })
    .sort({ authorizedAt: -1 })
    .lean();
  return rows.map((row) => mapDeliveryRow(row));
}

function parseManualDeliveryChannel(raw: string): WarningLetterDeliveryChannelType | null {
  const trimmed = raw.trim();
  if (!isManualWarningLetterDeliveryChannel(trimmed as WarningLetterDeliveryChannelType)) {
    return null;
  }
  if (!(WARNING_LETTER_MANUAL_DELIVERY_CHANNELS as readonly string[]).includes(trimmed)) {
    return null;
  }
  return trimmed as WarningLetterDeliveryChannelType;
}

function parseOperativeDeliveryStatus(raw: string): WarningLetterDeliveryRecordStatus | null {
  const values = [
    WarningLetterDeliveryRecordStatus.ATTEMPTED,
    WarningLetterDeliveryRecordStatus.SENT,
    WarningLetterDeliveryRecordStatus.FAILED,
  ] as const;
  return (values as readonly string[]).includes(raw)
    ? (raw as WarningLetterDeliveryRecordStatus)
    : null;
}

function parseSentAt(isoLocal: string): Date | null {
  const trimmed = isoLocal.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

async function assertEvidenceDocumentAsset(input: {
  buildingId: string;
  debtCaseId: string;
  documentAssetId: string;
}): Promise<void> {
  const asset = await DocumentAsset.findOne({
    documentAssetId: input.documentAssetId,
    buildingId: input.buildingId,
    deletedAt: null,
  }).lean();
  if (!asset) {
    throw new WarningLetterDraftError(
      WarningLetterDraftErrorCode.APPROVAL_BLOCKED,
      "מסמך הוכחה לא נמצא או לא שייך לבניין.",
    );
  }
  void input.debtCaseId;
}

function assertLawyerAdminOnly(context: AuthenticatedContext): void {
  if (context.user.role !== UserRole.LAWYER_ADMIN) {
    throw new WarningLetterDraftError(WarningLetterDraftErrorCode.APPROVAL_BLOCKED, "Lawyer admin only");
  }
}

export async function recordManualWarningLetterDelivery(input: {
  context: AuthenticatedContext;
  debtCaseId: string;
  finalDocumentId: string;
  channel: string;
  deliveryStatus: string;
  sentAtIsoLocal: string;
  recipientDisplayName: string;
  recipientContactHint?: string;
  trackingReference?: string;
  internalNotes?: string;
  evidenceDocumentAssetId?: string;
  idempotencyKey?: string;
  correlationId?: string;
}): Promise<{ created: boolean; record: WarningLetterDeliveryRecordView; caseLetterSent: boolean }> {
  await assertLawyerAdminDebtCaseReview({ context: input.context });
  assertLawyerAdminOnly(input.context);
  await connectMongo();

  const channel = parseManualDeliveryChannel(input.channel);
  const deliveryStatus = parseOperativeDeliveryStatus(input.deliveryStatus);
  const sentAt = parseSentAt(input.sentAtIsoLocal);

  if (!channel || !deliveryStatus || !sentAt) {
    throw new WarningLetterDraftError(WarningLetterDraftErrorCode.APPROVAL_BLOCKED, "פרטי משלוח לא תקינים");
  }

  if (!input.recipientDisplayName.trim()) {
    throw new WarningLetterDraftError(WarningLetterDraftErrorCode.APPROVAL_BLOCKED, "נמען חסר");
  }

  const idempotencyKey = input.idempotencyKey?.trim() || null;
  if (idempotencyKey) {
    const existing = await WarningLetterDeliveryRecord.findOne({
      debtCaseId: input.debtCaseId,
      idempotencyKey,
    }).lean();
    if (existing) {
      return {
        created: false,
        record: mapDeliveryRow(existing),
        caseLetterSent: deliveryStatusTriggersCaseLetterSent(
          existing.status as WarningLetterDeliveryRecordStatus,
        ),
      };
    }
  }

  const debtCase = await getDebtCase({ context: input.context, debtCaseId: input.debtCaseId });
  const finalDocument = await loadWarningLetterFinalDocumentForCase(input.debtCaseId);

  const blockers = collectWarningLetterManualDeliveryBlockersHe({ debtCase, finalDocument });
  if (blockers.length > 0) {
    throw new WarningLetterDraftError(
      WarningLetterDraftErrorCode.APPROVAL_BLOCKED,
      blockers.join(" | "),
    );
  }

  if (!finalDocument || finalDocument.finalDocumentId !== input.finalDocumentId) {
    throw new WarningLetterDraftError(WarningLetterDraftErrorCode.NOT_FOUND, "Final document mismatch");
  }

  if (input.evidenceDocumentAssetId?.trim()) {
    await assertEvidenceDocumentAsset({
      buildingId: debtCase.buildingId,
      debtCaseId: input.debtCaseId,
      documentAssetId: input.evidenceDocumentAssetId.trim(),
    });
  }

  const deliveryRecordId = randomUUID();
  const recordedAt = new Date();
  let caseLetterSent = false;

  try {
    await WarningLetterDeliveryRecord.create({
      deliveryRecordId,
      debtCaseId: input.debtCaseId,
      finalDocumentId: input.finalDocumentId,
      channel,
      status: deliveryStatus,
      recipientDisplayName: input.recipientDisplayName.trim(),
      recipientContactHint: input.recipientContactHint?.trim() || null,
      authorizedByUserId: new Types.ObjectId(input.context.user.id),
      authorizedAt: recordedAt,
      sentAt,
      attemptRecordedAt: sentAt,
      trackingReference: input.trackingReference?.trim() || null,
      internalNotes: input.internalNotes?.trim() || null,
      evidenceDocumentAssetId: input.evidenceDocumentAssetId?.trim() || null,
      idempotencyKey,
      failureNote:
        deliveryStatus === WarningLetterDeliveryRecordStatus.FAILED
          ? input.internalNotes?.trim() || "נכשל"
          : null,
    });
  } catch (error) {
    if ((error as { code?: number }).code === 11000 && idempotencyKey) {
      const raced = await WarningLetterDeliveryRecord.findOne({
        debtCaseId: input.debtCaseId,
        idempotencyKey,
      }).lean();
      if (raced) {
        return {
          created: false,
          record: mapDeliveryRow(raced),
          caseLetterSent: deliveryStatusTriggersCaseLetterSent(
            raced.status as WarningLetterDeliveryRecordStatus,
          ),
        };
      }
    }
    throw error;
  }

  await recordWarningLetterDeliveryEvent({
    context: input.context,
    deliveryRecordId,
    debtCaseId: input.debtCaseId,
    finalDocumentId: input.finalDocumentId,
    channel,
    status: deliveryStatus,
    correlationId: input.correlationId,
  });

  if (deliveryStatusTriggersCaseLetterSent(deliveryStatus)) {
    const transition = await applyDebtCaseLetterSentTransition({
      context: input.context,
      debtCaseId: input.debtCaseId,
      letterSentAt: sentAt,
      finalDocumentId: input.finalDocumentId,
      deliveryRecordId,
      correlationId: input.correlationId,
    });
    caseLetterSent = transition.transitioned || debtCase.workflowStatus === "letter_sent";
  }

  return {
    created: true,
    record: {
      deliveryRecordId,
      channel,
      status: deliveryStatus,
      statusHe: formatWarningLetterDeliveryRecordStatusHe(deliveryStatus),
      recipientDisplayName: input.recipientDisplayName.trim(),
      recipientContactHint: input.recipientContactHint?.trim() || null,
      sentAtIso: sentAt.toISOString(),
      confirmedDeliveredAtIso: null,
      recordedAtIso: recordedAt.toISOString(),
      trackingReference: input.trackingReference?.trim() || null,
      internalNotes: input.internalNotes?.trim() || null,
      evidenceDocumentAssetId: input.evidenceDocumentAssetId?.trim() || null,
      failureNote:
        deliveryStatus === WarningLetterDeliveryRecordStatus.FAILED
          ? input.internalNotes?.trim() || "נכשל"
          : null,
    },
    caseLetterSent,
  };
}

export async function confirmWarningLetterDeliveryDelivered(input: {
  context: AuthenticatedContext;
  debtCaseId: string;
  deliveryRecordId: string;
  confirmedDeliveredAtIsoLocal: string;
  internalNotes?: string;
  correlationId?: string;
}): Promise<WarningLetterDeliveryRecordView> {
  await assertLawyerAdminDebtCaseReview({ context: input.context });
  assertLawyerAdminOnly(input.context);
  await connectMongo();

  const confirmedAt = parseSentAt(input.confirmedDeliveredAtIsoLocal);
  if (!confirmedAt) {
    throw new WarningLetterDraftError(WarningLetterDraftErrorCode.APPROVAL_BLOCKED, "מועד קבלה לא תקין");
  }

  const row = await WarningLetterDeliveryRecord.findOne({
    deliveryRecordId: input.deliveryRecordId,
    debtCaseId: input.debtCaseId,
  }).lean();

  if (!row) {
    throw new WarningLetterDraftError(WarningLetterDraftErrorCode.NOT_FOUND, "Delivery record missing");
  }

  if (row.status === WarningLetterDeliveryRecordStatus.CONFIRMED_DELIVERED) {
    return mapDeliveryRow(row);
  }

  if (
    row.status !== WarningLetterDeliveryRecordStatus.SENT &&
    row.status !== WarningLetterDeliveryRecordStatus.ATTEMPTED &&
    row.status !== WarningLetterDeliveryRecordStatus.ATTEMPT_RECORDED &&
    row.status !== WarningLetterDeliveryRecordStatus.EVIDENCE_RECORDED
  ) {
    throw new WarningLetterDraftError(
      WarningLetterDraftErrorCode.APPROVAL_BLOCKED,
      "לא ניתן לאשר קבלה לרשומת משלוח זו",
    );
  }

  const notes = input.internalNotes?.trim();
  await WarningLetterDeliveryRecord.updateOne(
    { deliveryRecordId: input.deliveryRecordId },
    {
      $set: {
        status: WarningLetterDeliveryRecordStatus.CONFIRMED_DELIVERED,
        confirmedDeliveredAt: confirmedAt,
        ...(notes ? { internalNotes: notes } : {}),
      },
    },
  );

  await recordWarningLetterDeliveryConfirmedEvent({
    context: input.context,
    deliveryRecordId: input.deliveryRecordId,
    debtCaseId: input.debtCaseId,
    finalDocumentId: row.finalDocumentId,
    confirmedDeliveredAtIso: confirmedAt.toISOString(),
    correlationId: input.correlationId,
  });

  const updated = await WarningLetterDeliveryRecord.findOne({
    deliveryRecordId: input.deliveryRecordId,
  }).lean();
  return mapDeliveryRow(updated!);
}

/** @deprecated CP20 — use recordManualWarningLetterDelivery */
export async function authorizeWarningLetterDeliveryAttempt(input: {
  context: AuthenticatedContext;
  debtCaseId: string;
  finalDocumentId: string;
  channel: string;
  recipientDisplayName: string;
  recipientContactHint?: string;
  legalReadiness?: unknown;
  correlationId?: string;
}): Promise<WarningLetterDeliveryRecordView> {
  void input.legalReadiness;
  const sentAtIsoLocal = new Date().toISOString();
  const result = await recordManualWarningLetterDelivery({
    context: input.context,
    debtCaseId: input.debtCaseId,
    finalDocumentId: input.finalDocumentId,
    channel: input.channel,
    deliveryStatus: WarningLetterDeliveryRecordStatus.ATTEMPTED,
    sentAtIsoLocal,
    recipientDisplayName: input.recipientDisplayName,
    recipientContactHint: input.recipientContactHint,
    correlationId: input.correlationId,
  });
  return result.record;
}

/** @deprecated CP20 — use confirmWarningLetterDeliveryDelivered or recordManualWarningLetterDelivery */
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
          sentAt: row.sentAt ?? now,
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
        sentAt: row.sentAt ?? now,
        trackingReference: input.trackingReference?.trim() || null,
        internalNotes: input.evidenceNote?.trim() || null,
      },
    },
  );
}