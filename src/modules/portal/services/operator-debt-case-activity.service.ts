import "server-only";

import { AuditEvent } from "@/modules/audit/infra/audit-event.model";
import { getDebtCase } from "@/modules/debt-cases/services/debt-case.service";
import {
  isOperatorVisibleDebtCaseAuditEventType,
  OPERATOR_DEBT_CASE_ACTIVITY_DEFAULT_LIMIT,
  OPERATOR_PORTAL_RECENT_ACTIVITY_LIMIT,
  OPERATOR_VISIBLE_DEBT_CASE_AUDIT_EVENT_TYPES,
} from "@/modules/portal/domain/operator-debt-case-audit-policy";
import {
  formatOperatorDebtCaseActivityTitleHe,
  OPERATOR_REJECTION_GENERIC_MESSAGE_HE,
} from "@/modules/portal/presentation/operator-debt-case-activity.he";
import { AuditEventType } from "@/shared/audit/domain/audit-event-taxonomy";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import { getAccessibleBuildingPublicIds } from "@/shared/auth/building-access";
import { connectMongo } from "@/shared/db/connect";

export type OperatorDebtCaseActivityEntry = {
  eventType: string;
  occurredAtIso: string;
  titleHe: string;
  detailHe: string | null;
  debtCaseId: string;
  buildingId: string;
};

function sanitizeReviewCommentHe(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed.length < 3 || trimmed.length > 500) {
    return null;
  }
  return trimmed;
}

function mapAuditRowToActivityEntry(row: {
  eventType: string;
  occurredAt: Date;
  targetEntityId?: string | null;
  metadata?: unknown;
}): OperatorDebtCaseActivityEntry | null {
  if (!isOperatorVisibleDebtCaseAuditEventType(row.eventType)) {
    return null;
  }
  const debtCaseId = row.targetEntityId?.trim();
  if (!debtCaseId) {
    return null;
  }
  const metadata =
    row.metadata && typeof row.metadata === "object"
      ? (row.metadata as Record<string, unknown>)
      : {};
  const buildingId = typeof metadata.buildingId === "string" ? metadata.buildingId : "";

  let detailHe: string | null = null;
  if (row.eventType === AuditEventType.DEBT_CASE_RETURNED) {
    detailHe = sanitizeReviewCommentHe(metadata.reviewCommentHe);
  } else if (row.eventType === AuditEventType.DEBT_CASE_REJECTED) {
    detailHe = OPERATOR_REJECTION_GENERIC_MESSAGE_HE;
  }

  return {
    eventType: row.eventType,
    occurredAtIso: row.occurredAt.toISOString(),
    titleHe: formatOperatorDebtCaseActivityTitleHe(row.eventType),
    detailHe,
    debtCaseId,
    buildingId,
  };
}

export async function loadOperatorDebtCaseActivity(input: {
  context: AuthenticatedContext;
  debtCaseId: string;
  limit?: number;
}): Promise<OperatorDebtCaseActivityEntry[]> {
  const limit = input.limit ?? OPERATOR_DEBT_CASE_ACTIVITY_DEFAULT_LIMIT;
  await getDebtCase({ context: input.context, debtCaseId: input.debtCaseId });

  await connectMongo();
  const rows = await AuditEvent.find({
    targetEntityType: "debt_case",
    targetEntityId: input.debtCaseId,
    eventType: { $in: [...OPERATOR_VISIBLE_DEBT_CASE_AUDIT_EVENT_TYPES] },
  })
    .sort({ occurredAt: -1 })
    .limit(limit * 2)
    .select("eventType occurredAt targetEntityId metadata")
    .lean();

  const filtered = rows
    .map((row) =>
      mapAuditRowToActivityEntry({
        eventType: row.eventType,
        occurredAt: row.occurredAt,
        targetEntityId: row.targetEntityId,
        metadata: row.metadata,
      }),
    )
    .filter((entry): entry is OperatorDebtCaseActivityEntry => entry != null)
    .slice(0, limit);

  return filtered.reverse();
}

export async function loadLatestOperatorReturnFeedbackHe(input: {
  context: AuthenticatedContext;
  debtCaseId: string;
}): Promise<string | null> {
  await getDebtCase({ context: input.context, debtCaseId: input.debtCaseId });

  await connectMongo();
  const row = await AuditEvent.findOne({
    targetEntityType: "debt_case",
    targetEntityId: input.debtCaseId,
    eventType: AuditEventType.DEBT_CASE_RETURNED,
  })
    .sort({ occurredAt: -1 })
    .select("metadata")
    .lean();

  if (!row?.metadata || typeof row.metadata !== "object") {
    return null;
  }
  return sanitizeReviewCommentHe((row.metadata as Record<string, unknown>).reviewCommentHe);
}

export async function loadOperatorRecentActivityForBuildings(input: {
  context: AuthenticatedContext;
  buildingIds: readonly string[];
  limit?: number;
}): Promise<OperatorDebtCaseActivityEntry[]> {
  const limit = input.limit ?? OPERATOR_PORTAL_RECENT_ACTIVITY_LIMIT;
  if (input.buildingIds.length === 0) {
    return [];
  }

  const allowedBuildingIds = new Set(await getAccessibleBuildingPublicIds(input.context));
  const scopedIds = input.buildingIds.filter((id) => allowedBuildingIds.has(id));
  if (scopedIds.length === 0) {
    return [];
  }

  await connectMongo();
  const rows = await AuditEvent.find({
    eventType: { $in: [...OPERATOR_VISIBLE_DEBT_CASE_AUDIT_EVENT_TYPES] },
    "metadata.buildingId": { $in: scopedIds },
  })
    .sort({ occurredAt: -1 })
    .limit(limit * 2)
    .select("eventType occurredAt targetEntityId metadata")
    .lean();

  const entries: OperatorDebtCaseActivityEntry[] = [];
  for (const row of rows) {
    const entry = mapAuditRowToActivityEntry({
      eventType: row.eventType,
      occurredAt: row.occurredAt,
      targetEntityId: row.targetEntityId,
      metadata: row.metadata,
    });
    if (entry && allowedBuildingIds.has(entry.buildingId)) {
      entries.push(entry);
    }
    if (entries.length >= limit) {
      break;
    }
  }

  return entries;
}
