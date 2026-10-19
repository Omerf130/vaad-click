import "server-only";

import { Building } from "@/modules/buildings/infra/building.model";
import { AccountStatus } from "@/modules/users/domain/account-status";
import { DebtCaseLawyerReviewStatus } from "@/modules/debt-cases/domain/debt-case-lawyer-review-status";
import { DebtCaseWorkflowStatus } from "@/modules/debt-cases/domain/debt-case-workflow-status";
import { DebtCase } from "@/modules/debt-cases/infra/debt-case.model";
import { buildPendingUserDraftListFilter } from "@/modules/debt-cases/services/debt-case-authorization.service";
import { formatWorkflowStatusHe } from "@/modules/debt-cases/presentation/debt-case-labels.he";
import { dateFieldLabelHe } from "@/modules/reports/presentation/report-labels.he";
import { mongoAggCountIfAwaitingLawyerReview } from "@/modules/reports/domain/report-awaiting-lawyer-review";
import { ReportDateField } from "@/modules/reports/domain/report-date-field";
import {
  mongoDateFieldPath,
  resolveReportDateRange,
  type ResolvedReportDateRange,
} from "@/modules/reports/services/report-date-range";
import type { ReportScope } from "@/modules/reports/services/report-scope.service";
import type { ReportFilters } from "@/modules/reports/validation/report-filters.schema";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import { connectMongo } from "@/shared/db/connect";

export const REPORT_MAX_EXPORT_ROWS = 5_000;

export type ReportOverviewMetrics = {
  accessibleBuildings: number;
  totalDebtCases: number;
  draftCases: number;
  awaitingLawyerReview: number;
  returnedForCompletion: number;
  approvedForLetterPrep: number;
  rejectedCases: number;
  newSubmissionsInRange: number;
  recordedDebtMinor: number;
  casesWithRecordedDebt: number;
};

export type ReportStatusBucket = {
  status: DebtCaseWorkflowStatus;
  labelHe: string;
  count: number;
};

export type ReportSubmissionTrendPoint = {
  periodKey: string;
  labelHe: string;
  count: number;
};

export type ReportDebtCaseRow = {
  debtCaseId: string;
  buildingId: string;
  buildingDisplayName: string;
  apartmentNumberDisplay: string;
  workflowStatus: DebtCaseWorkflowStatus;
  workflowStatusHe: string;
  lawyerReviewStatus: DebtCaseLawyerReviewStatus;
  createdAtIso: string;
  submittedAtIso: string | null;
  updatedAtIso: string;
  principalAmountMinor: number | null;
  caseHref: string;
};

export type ReportDebtCaseListResult = {
  items: ReportDebtCaseRow[];
  total: number;
  page: number;
  totalPages: number;
};

export type ReportBuildingSummaryRow = {
  buildingId: string;
  displayName: string;
  city: string;
  totalCases: number;
  awaitingReview: number;
  returned: number;
  approvedForLetterPrep: number;
  recordedDebtMinor: number;
};

function buildBaseMatch(input: {
  context: AuthenticatedContext;
  scope: ReportScope;
  filters: ReportFilters;
  dateRange: ResolvedReportDateRange;
}): Record<string, unknown> {
  const match: Record<string, unknown> = {
    buildingId: { $in: input.scope.buildingIds },
  };

  if (input.context.user.accountStatus === AccountStatus.PENDING_APPROVAL) {
    Object.assign(match, buildPendingUserDraftListFilter(input.context.user.id));
  }

  if (input.filters.workflowStatus) {
    match.workflowStatus = input.filters.workflowStatus;
  }

  const datePath = mongoDateFieldPath(input.dateRange.dateField);
  if (input.dateRange.fromUtc || input.dateRange.toUtc) {
    const dateCond: Record<string, unknown> = {};
    if (input.dateRange.fromUtc) {
      dateCond.$gte = input.dateRange.fromUtc;
    }
    if (input.dateRange.toUtc) {
      dateCond.$lte = input.dateRange.toUtc;
    }
    if (input.dateRange.dateField === ReportDateField.SUBMITTED) {
      dateCond.$ne = null;
    }
    match[datePath] = dateCond;
  }

  const q = input.filters.q?.trim();
  if (q) {
    match.$or = [
      { debtCaseId: q },
      { apartmentNumberDisplay: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } },
    ];
  }

  return match;
}

function sortSpec(sort: ReportFilters["sort"]): Record<string, 1 | -1> {
  switch (sort) {
    case "oldest":
      return { updatedAt: 1 };
    case "amount_desc":
      return { principalAmountMinor: -1, updatedAt: -1 };
    case "amount_asc":
      return { principalAmountMinor: 1, updatedAt: -1 };
    case "newest":
    default:
      return { updatedAt: -1 };
  }
}

function caseHref(scope: ReportScope, buildingId: string, debtCaseId: string): string {
  if (scope.kind === "lawyer_admin") {
    return `/app/admin/debt-cases/${debtCaseId}`;
  }
  return `/app/buildings/${buildingId}/debt-cases/${debtCaseId}`;
}

export async function loadReportOverview(input: {
  context: AuthenticatedContext;
  scope: ReportScope;
  filters: ReportFilters;
}): Promise<{
  metrics: ReportOverviewMetrics;
  dateRange: ResolvedReportDateRange;
  dateFieldLabel: string;
}> {
  await connectMongo();
  const dateRange = resolveReportDateRange({
    preset: input.filters.preset,
    dateField: input.filters.dateField,
    customFrom: input.filters.customFrom,
    customTo: input.filters.customTo,
  });

  if (input.scope.buildingIds.length === 0) {
    return {
      metrics: {
        accessibleBuildings: 0,
        totalDebtCases: 0,
        draftCases: 0,
        awaitingLawyerReview: 0,
        returnedForCompletion: 0,
        approvedForLetterPrep: 0,
        rejectedCases: 0,
        newSubmissionsInRange: 0,
        recordedDebtMinor: 0,
        casesWithRecordedDebt: 0,
      },
      dateRange,
      dateFieldLabel: dateFieldLabelHe(dateRange.dateField),
    };
  }

  const match = buildBaseMatch({
    context: input.context,
    scope: input.scope,
    filters: { ...input.filters, workflowStatus: null },
    dateRange,
  });

  const [statusAgg, financialAgg, submissionCount] = await Promise.all([
    DebtCase.aggregate<{
      _id: null;
      total: number;
      draft: number;
      awaiting: number;
      returned: number;
      approved: number;
      rejected: number;
    }>([
      { $match: match },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          draft: {
            $sum: { $cond: [{ $eq: ["$workflowStatus", DebtCaseWorkflowStatus.DRAFT] }, 1, 0] },
          },
          awaiting: { $sum: mongoAggCountIfAwaitingLawyerReview() },
          returned: {
            $sum: {
              $cond: [{ $eq: ["$workflowStatus", DebtCaseWorkflowStatus.RETURNED_FOR_COMPLETION] }, 1, 0],
            },
          },
          approved: {
            $sum: {
              $cond: [
                { $eq: ["$lawyerReviewStatus", DebtCaseLawyerReviewStatus.APPROVED_FOR_LETTER_PREP] },
                1,
                0,
              ],
            },
          },
          rejected: {
            $sum: { $cond: [{ $eq: ["$workflowStatus", DebtCaseWorkflowStatus.REJECTED] }, 1, 0] },
          },
        },
      },
    ]),
    DebtCase.aggregate<{ _id: null; sumMinor: number; count: number }>([
      {
        $match: {
          ...match,
          principalAmountMinor: { $type: "number", $gt: 0 },
        },
      },
      {
        $group: {
          _id: null,
          sumMinor: { $sum: "$principalAmountMinor" },
          count: { $sum: 1 },
        },
      },
    ]),
    DebtCase.countDocuments({
      buildingId: { $in: input.scope.buildingIds },
      submittedAt: {
        ...(dateRange.fromUtc ? { $gte: dateRange.fromUtc } : {}),
        ...(dateRange.toUtc ? { $lte: dateRange.toUtc } : {}),
        $ne: null,
      },
    }),
  ]);

  const bucket = statusAgg[0] ?? {
    total: 0,
    draft: 0,
    awaiting: 0,
    returned: 0,
    approved: 0,
    rejected: 0,
  };
  const fin = financialAgg[0] ?? { sumMinor: 0, count: 0 };

  return {
    metrics: {
      accessibleBuildings: input.scope.buildingIds.length,
      totalDebtCases: bucket.total,
      draftCases: bucket.draft,
      awaitingLawyerReview: bucket.awaiting,
      returnedForCompletion: bucket.returned,
      approvedForLetterPrep: bucket.approved,
      rejectedCases: bucket.rejected,
      newSubmissionsInRange: submissionCount,
      recordedDebtMinor: fin.sumMinor,
      casesWithRecordedDebt: fin.count,
    },
    dateRange,
    dateFieldLabel: dateFieldLabelHe(dateRange.dateField),
  };
}

export async function loadReportStatusDistribution(input: {
  context: AuthenticatedContext;
  scope: ReportScope;
  filters: ReportFilters;
}): Promise<{ buckets: ReportStatusBucket[]; noteHe: string }> {
  await connectMongo();
  const dateRange = resolveReportDateRange({
    preset: input.filters.preset,
    dateField: input.filters.dateField,
    customFrom: input.filters.customFrom,
    customTo: input.filters.customTo,
  });
  if (input.scope.buildingIds.length === 0) {
    return { buckets: [], noteHe: "התפלגות לפי סטטוס נוכחי — אין נתונים." };
  }

  const match = buildBaseMatch({
    context: input.context,
    scope: input.scope,
    filters: input.filters,
    dateRange,
  });
  const rows = await DebtCase.aggregate<{ _id: string; count: number }>([
    { $match: match },
    { $group: { _id: "$workflowStatus", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  return {
    buckets: rows.map((row) => ({
      status: row._id as DebtCaseWorkflowStatus,
      labelHe: formatWorkflowStatusHe(row._id as DebtCaseWorkflowStatus),
      count: row.count,
    })),
    noteHe: `התפלגות לפי סטטוס תיק נוכחי (מסונן לפי ${dateFieldLabelHe(dateRange.dateField)}).`,
  };
}

export async function loadReportSubmissionTrend(input: {
  context: AuthenticatedContext;
  scope: ReportScope;
  filters: ReportFilters;
}): Promise<{ points: ReportSubmissionTrendPoint[]; noteHe: string }> {
  await connectMongo();
  const dateRange = resolveReportDateRange({
    preset: input.filters.preset,
    dateField: ReportDateField.SUBMITTED,
    customFrom: input.filters.customFrom,
    customTo: input.filters.customTo,
  });

  if (input.scope.buildingIds.length === 0) {
    return { points: [], noteHe: "מגמת הגשות — אין נתונים." };
  }

  const submittedAtCond: Record<string, unknown> = { $ne: null };
  if (dateRange.fromUtc) {
    submittedAtCond.$gte = dateRange.fromUtc;
  }
  if (dateRange.toUtc) {
    submittedAtCond.$lte = dateRange.toUtc;
  }
  const match: Record<string, unknown> = {
    buildingId: { $in: input.scope.buildingIds },
    submittedAt: submittedAtCond,
  };

  const rows = await DebtCase.aggregate<{ _id: { y: number; m: number }; count: number }>([
    { $match: match },
    {
      $group: {
        _id: { y: { $year: "$submittedAt" }, m: { $month: "$submittedAt" } },
        count: { $sum: 1 },
      },
    },
    { $sort: { "_id.y": 1, "_id.m": 1 } },
    { $limit: 24 },
  ]);

  return {
    points: rows.map((row) => ({
      periodKey: `${row._id.y}-${String(row._id.m).padStart(2, "0")}`,
      labelHe: `${String(row._id.m).padStart(2, "0")}/${row._id.y}`,
      count: row.count,
    })),
    noteHe: "מגמת הגשות לפי חודש (תאריך הגשה בפועל).",
  };
}

export async function listReportDebtCases(input: {
  context: AuthenticatedContext;
  scope: ReportScope;
  filters: ReportFilters;
}): Promise<ReportDebtCaseListResult> {
  await connectMongo();
  const dateRange = resolveReportDateRange({
    preset: input.filters.preset,
    dateField: input.filters.dateField,
    customFrom: input.filters.customFrom,
    customTo: input.filters.customTo,
  });

  if (input.scope.buildingIds.length === 0) {
    return { items: [], total: 0, page: input.filters.page, totalPages: 0 };
  }

  const match = buildBaseMatch({ context: input.context, scope: input.scope, filters: input.filters, dateRange });
  const page = input.filters.page;
  const pageSize = input.filters.pageSize;
  const skip = (page - 1) * pageSize;

  const [total, docs, buildingRows] = await Promise.all([
    DebtCase.countDocuments(match),
    DebtCase.find(match).sort(sortSpec(input.filters.sort)).skip(skip).limit(pageSize).lean(),
    Building.find({ buildingId: { $in: input.scope.buildingIds } })
      .select("buildingId displayName")
      .lean(),
  ]);

  const buildingNames = new Map(buildingRows.map((b) => [b.buildingId, b.displayName ?? b.buildingId]));

  const items: ReportDebtCaseRow[] = docs.map((doc) => ({
    debtCaseId: doc.debtCaseId,
    buildingId: doc.buildingId,
    buildingDisplayName: buildingNames.get(doc.buildingId) ?? doc.buildingId,
    apartmentNumberDisplay: doc.apartmentNumberDisplay ?? "",
    workflowStatus: doc.workflowStatus as DebtCaseWorkflowStatus,
    workflowStatusHe: formatWorkflowStatusHe(doc.workflowStatus as DebtCaseWorkflowStatus),
    lawyerReviewStatus: doc.lawyerReviewStatus as DebtCaseLawyerReviewStatus,
    createdAtIso: doc.createdAt.toISOString(),
    submittedAtIso: doc.submittedAt ? doc.submittedAt.toISOString() : null,
    updatedAtIso: doc.updatedAt.toISOString(),
    principalAmountMinor:
      typeof doc.principalAmountMinor === "number" ? doc.principalAmountMinor : null,
    caseHref: caseHref(input.scope, doc.buildingId, doc.debtCaseId),
  }));

  return {
    items,
    total,
    page,
    totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
  };
}

export async function listReportBuildingSummaries(input: {
  context: AuthenticatedContext;
  scope: ReportScope;
  filters: ReportFilters;
}): Promise<ReportBuildingSummaryRow[]> {
  await connectMongo();
  if (input.scope.buildingIds.length === 0) {
    return [];
  }

  const dateRange = resolveReportDateRange({
    preset: input.filters.preset,
    dateField: input.filters.dateField,
    customFrom: input.filters.customFrom,
    customTo: input.filters.customTo,
  });
  const match = buildBaseMatch({
    context: input.context,
    scope: input.scope,
    filters: { ...input.filters, workflowStatus: null },
    dateRange,
  });

  const [agg, buildings] = await Promise.all([
    DebtCase.aggregate<{
      _id: string;
      total: number;
      awaiting: number;
      returned: number;
      approved: number;
      debtMinor: number;
    }>([
      { $match: match },
      {
        $group: {
          _id: "$buildingId",
          total: { $sum: 1 },
          awaiting: { $sum: mongoAggCountIfAwaitingLawyerReview() },
          returned: {
            $sum: {
              $cond: [{ $eq: ["$workflowStatus", DebtCaseWorkflowStatus.RETURNED_FOR_COMPLETION] }, 1, 0],
            },
          },
          approved: {
            $sum: {
              $cond: [
                { $eq: ["$lawyerReviewStatus", DebtCaseLawyerReviewStatus.APPROVED_FOR_LETTER_PREP] },
                1,
                0,
              ],
            },
          },
          debtMinor: {
            $sum: {
              $cond: [
                { $gt: ["$principalAmountMinor", 0] },
                "$principalAmountMinor",
                0,
              ],
            },
          },
        },
      },
      { $sort: { total: -1 } },
    ]),
    Building.find({ buildingId: { $in: input.scope.buildingIds } })
      .select("buildingId displayName address.city")
      .lean(),
  ]);

  const meta = new Map(
    buildings.map((b) => [
      b.buildingId,
      { displayName: b.displayName ?? b.buildingId, city: b.address?.city ?? "" },
    ]),
  );

  return agg.map((row) => {
    const info = meta.get(row._id) ?? { displayName: row._id, city: "" };
    return {
      buildingId: row._id,
      displayName: info.displayName,
      city: info.city,
      totalCases: row.total,
      awaitingReview: row.awaiting,
      returned: row.returned,
      approvedForLetterPrep: row.approved,
      recordedDebtMinor: row.debtMinor,
    };
  });
}

export async function fetchDebtCasesForExport(input: {
  context: AuthenticatedContext;
  scope: ReportScope;
  filters: ReportFilters;
}): Promise<ReportDebtCaseRow[]> {
  const list = await listReportDebtCases({
    context: input.context,
    scope: input.scope,
    filters: { ...input.filters, page: 1, pageSize: REPORT_MAX_EXPORT_ROWS },
  });
  if (list.total > REPORT_MAX_EXPORT_ROWS) {
    throw new Error("EXPORT_LIMIT_EXCEEDED");
  }
  return list.items;
}
