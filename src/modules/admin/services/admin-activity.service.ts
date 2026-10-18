import "server-only";

import { AuditEvent } from "@/modules/audit/infra/audit-event.model";
import {
  ADMIN_DASHBOARD_ACTIVITY_EVENT_TYPES,
  ADMIN_DASHBOARD_ACTIVITY_LIMIT,
  ADMIN_DEBT_CASE_ACTIVITY_EVENT_TYPES,
  ADMIN_DEBT_CASE_ACTIVITY_LIMIT,
  isAdminDashboardActivityEventType,
  isAdminDebtCaseActivityEventType,
} from "@/modules/admin/domain/admin-audit-policy";
import {
  formatAdminActivityTitleHe,
  sanitizeAdminActivityDetailHe,
} from "@/modules/admin/presentation/admin-activity.he";
import { assertLawyerAdminOrganization } from "@/modules/organizations/services/assert-lawyer-admin";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import { connectMongo } from "@/shared/db/connect";

export type AdminActivityEntry = {
  eventType: string;
  occurredAtIso: string;
  titleHe: string;
  detailHe: string | null;
  targetEntityType: string | null;
  targetEntityId: string | null;
};

function mapRow(row: {
  eventType: string;
  occurredAt: Date;
  targetEntityType?: string | null;
  targetEntityId?: string | null;
  metadata?: unknown;
}): AdminActivityEntry {
  return {
    eventType: row.eventType,
    occurredAtIso: row.occurredAt.toISOString(),
    titleHe: formatAdminActivityTitleHe(row.eventType),
    detailHe: sanitizeAdminActivityDetailHe(row.eventType, row.metadata),
    targetEntityType: row.targetEntityType ?? null,
    targetEntityId: row.targetEntityId ?? null,
  };
}

export async function loadAdminDashboardRecentActivity(input: {
  context: AuthenticatedContext;
  limit?: number;
}): Promise<AdminActivityEntry[]> {
  assertLawyerAdminOrganization(input.context);
  const limit = input.limit ?? ADMIN_DASHBOARD_ACTIVITY_LIMIT;

  await connectMongo();
  const rows = await AuditEvent.find({
    eventType: { $in: [...ADMIN_DASHBOARD_ACTIVITY_EVENT_TYPES] },
  })
    .sort({ occurredAt: -1 })
    .limit(limit)
    .select("eventType occurredAt targetEntityType targetEntityId metadata")
    .lean();

  return rows.map(mapRow);
}

export async function loadAdminDebtCaseActivity(input: {
  context: AuthenticatedContext;
  debtCaseId: string;
  limit?: number;
}): Promise<AdminActivityEntry[]> {
  assertLawyerAdminOrganization(input.context);
  const limit = input.limit ?? ADMIN_DEBT_CASE_ACTIVITY_LIMIT;

  await connectMongo();
  const rows = await AuditEvent.find({
    targetEntityType: "debt_case",
    targetEntityId: input.debtCaseId,
    eventType: { $in: [...ADMIN_DEBT_CASE_ACTIVITY_EVENT_TYPES] },
  })
    .sort({ occurredAt: -1 })
    .limit(limit * 2)
    .select("eventType occurredAt targetEntityType targetEntityId metadata")
    .lean();

  const filtered = rows
    .filter((row) => isAdminDebtCaseActivityEventType(row.eventType))
    .slice(0, limit)
    .reverse();

  return filtered.map(mapRow);
}

export function filterDashboardActivityRow(eventType: string): boolean {
  return isAdminDashboardActivityEventType(eventType);
}
