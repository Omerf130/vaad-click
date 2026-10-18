import "server-only";

import { Building } from "@/modules/buildings/infra/building.model";
import { AccountStatus } from "@/modules/users/domain/account-status";
import { UserRole } from "@/modules/users/domain/user-role";
import { DebtCaseLawyerReviewStatus } from "@/modules/debt-cases/domain/debt-case-lawyer-review-status";
import { DebtCaseWorkflowStatus } from "@/modules/debt-cases/domain/debt-case-workflow-status";
import { DebtCase } from "@/modules/debt-cases/infra/debt-case.model";
import { buildPendingUserDraftListFilter } from "@/modules/debt-cases/services/debt-case-authorization.service";
import {
  getAccessibleBuildingPublicIds,
  listAccessibleBuildings,
} from "@/shared/auth/building-access";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import type { OperatorDebtCaseActivityEntry } from "@/modules/portal/services/operator-debt-case-activity.service";
import { loadOperatorRecentActivityForBuildings } from "@/modules/portal/services/operator-debt-case-activity.service";
import { connectMongo } from "@/shared/db/connect";

export type OperatorDebtCaseMetrics = {
  totalDebtCases: number;
  pendingLawyerReview: number;
  returnedForCompletion: number;
  approvedForLetterPrep: number;
};

export type OperatorDashboardActionItem = {
  debtCaseId: string;
  buildingId: string;
  buildingDisplayName: string;
  apartmentNumberDisplay: string;
  workflowStatus: string;
  lawyerReviewStatus: string;
  updatedAtIso: string;
};

export type OperatorDashboardBuilding = {
  buildingId: string;
  displayName: string;
  city: string;
  lawyerVerificationStatus: string;
  metrics: OperatorDebtCaseMetrics;
};

export type BuildingRepPortalDashboard = {
  kind: "building_rep";
  building: OperatorDashboardBuilding;
  metrics: OperatorDebtCaseMetrics;
  actionItems: OperatorDashboardActionItem[];
  waitingForLawyerItems: OperatorDashboardActionItem[];
  recentActivity: OperatorDebtCaseActivityEntry[];
};

export type ManagementCompanyPortalDashboard = {
  kind: "management_company";
  assignedBuildingCount: number;
  aggregateMetrics: OperatorDebtCaseMetrics;
  buildings: OperatorDashboardBuilding[];
  actionItems: OperatorDashboardActionItem[];
  waitingForLawyerItems: OperatorDashboardActionItem[];
  recentActivity: OperatorDebtCaseActivityEntry[];
};

export type OperatorPortalDashboardEmpty = {
  kind: "empty";
};

export type OperatorPortalDashboard =
  | BuildingRepPortalDashboard
  | ManagementCompanyPortalDashboard
  | OperatorPortalDashboardEmpty;

const EMPTY_METRICS: OperatorDebtCaseMetrics = {
  totalDebtCases: 0,
  pendingLawyerReview: 0,
  returnedForCompletion: 0,
  approvedForLetterPrep: 0,
};

function buildDebtCaseScopeFilter(input: {
  context: AuthenticatedContext;
  buildingIds: readonly string[];
}): Record<string, unknown> {
  const filter: Record<string, unknown> = {
    buildingId: { $in: [...input.buildingIds] },
  };
  if (input.context.user.accountStatus === AccountStatus.PENDING_APPROVAL) {
    return {
      ...filter,
      ...buildPendingUserDraftListFilter(input.context.user.id),
    };
  }
  return filter;
}

async function aggregateMetricsForBuildings(input: {
  context: AuthenticatedContext;
  buildingIds: readonly string[];
}): Promise<Map<string, OperatorDebtCaseMetrics>> {
  if (input.buildingIds.length === 0) {
    return new Map();
  }

  await connectMongo();
  const match = buildDebtCaseScopeFilter(input);
  const rows = await DebtCase.aggregate<{
    _id: string;
    totalDebtCases: number;
    pendingLawyerReview: number;
    returnedForCompletion: number;
    approvedForLetterPrep: number;
  }>([
    { $match: match },
    {
      $group: {
        _id: "$buildingId",
        totalDebtCases: { $sum: 1 },
        pendingLawyerReview: {
          $sum: {
            $cond: [
              { $eq: ["$lawyerReviewStatus", DebtCaseLawyerReviewStatus.PENDING] },
              1,
              0,
            ],
          },
        },
        returnedForCompletion: {
          $sum: {
            $cond: [
              { $eq: ["$workflowStatus", DebtCaseWorkflowStatus.RETURNED_FOR_COMPLETION] },
              1,
              0,
            ],
          },
        },
        approvedForLetterPrep: {
          $sum: {
            $cond: [
              {
                $eq: [
                  "$lawyerReviewStatus",
                  DebtCaseLawyerReviewStatus.APPROVED_FOR_LETTER_PREP,
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
  ]);

  const map = new Map<string, OperatorDebtCaseMetrics>();
  for (const row of rows) {
    map.set(row._id, {
      totalDebtCases: row.totalDebtCases,
      pendingLawyerReview: row.pendingLawyerReview,
      returnedForCompletion: row.returnedForCompletion,
      approvedForLetterPrep: row.approvedForLetterPrep,
    });
  }
  return map;
}

function sumMetrics(metricsByBuilding: Iterable<OperatorDebtCaseMetrics>): OperatorDebtCaseMetrics {
  const total = { ...EMPTY_METRICS };
  for (const metrics of metricsByBuilding) {
    total.totalDebtCases += metrics.totalDebtCases;
    total.pendingLawyerReview += metrics.pendingLawyerReview;
    total.returnedForCompletion += metrics.returnedForCompletion;
    total.approvedForLetterPrep += metrics.approvedForLetterPrep;
  }
  return total;
}

async function listActionRequiredDebtCases(input: {
  context: AuthenticatedContext;
  buildingIds: readonly string[];
  buildingNames: Map<string, string>;
  limit: number;
}): Promise<OperatorDashboardActionItem[]> {
  if (input.buildingIds.length === 0) {
    return [];
  }

  await connectMongo();
  const match = {
    ...buildDebtCaseScopeFilter(input),
    workflowStatus: {
      $in: [
        DebtCaseWorkflowStatus.RETURNED_FOR_COMPLETION,
        DebtCaseWorkflowStatus.DRAFT,
      ],
    },
  };

  const rows = await DebtCase.find(match)
    .select(
      "debtCaseId buildingId apartmentNumberDisplay workflowStatus lawyerReviewStatus updatedAt",
    )
    .sort({ updatedAt: -1 })
    .limit(input.limit)
    .lean();

  return rows.map((row) => ({
    debtCaseId: row.debtCaseId,
    buildingId: row.buildingId,
    buildingDisplayName: input.buildingNames.get(row.buildingId) ?? "בניין",
    apartmentNumberDisplay: row.apartmentNumberDisplay ?? "—",
    workflowStatus: row.workflowStatus,
    lawyerReviewStatus: row.lawyerReviewStatus,
    updatedAtIso: row.updatedAt?.toISOString() ?? new Date(0).toISOString(),
  }));
}

async function listWaitingForLawyerDebtCases(input: {
  context: AuthenticatedContext;
  buildingIds: readonly string[];
  buildingNames: Map<string, string>;
  limit: number;
}): Promise<OperatorDashboardActionItem[]> {
  if (input.buildingIds.length === 0) {
    return [];
  }

  await connectMongo();
  const match = {
    ...buildDebtCaseScopeFilter(input),
    workflowStatus: DebtCaseWorkflowStatus.AWAITING_LAWYER_REVIEW,
    lawyerReviewStatus: DebtCaseLawyerReviewStatus.PENDING,
  };

  const rows = await DebtCase.find(match)
    .select(
      "debtCaseId buildingId apartmentNumberDisplay workflowStatus lawyerReviewStatus updatedAt",
    )
    .sort({ updatedAt: -1 })
    .limit(input.limit)
    .lean();

  return rows.map((row) => ({
    debtCaseId: row.debtCaseId,
    buildingId: row.buildingId,
    buildingDisplayName: input.buildingNames.get(row.buildingId) ?? "בניין",
    apartmentNumberDisplay: row.apartmentNumberDisplay ?? "—",
    workflowStatus: row.workflowStatus,
    lawyerReviewStatus: row.lawyerReviewStatus,
    updatedAtIso: row.updatedAt?.toISOString() ?? new Date(0).toISOString(),
  }));
}

export async function loadOperatorPortalDashboard(
  context: AuthenticatedContext,
): Promise<OperatorPortalDashboard> {
  const buildingRows = await listAccessibleBuildings({ context });
  if (buildingRows.length === 0) {
    return { kind: "empty" };
  }

  const buildingIds = await getAccessibleBuildingPublicIds(context);
  const metricsByBuilding = await aggregateMetricsForBuildings({ context, buildingIds });
  const buildingNames = new Map(buildingRows.map((row) => [row.buildingId, row.displayName]));

  const buildings: OperatorDashboardBuilding[] = buildingRows.map((row) => ({
    buildingId: row.buildingId,
    displayName: row.displayName,
    city: "",
    lawyerVerificationStatus: "not_started",
    metrics: metricsByBuilding.get(row.buildingId) ?? { ...EMPTY_METRICS },
  }));

  await connectMongo();
  const addressRows = await Building.find({ buildingId: { $in: [...buildingIds] } })
    .select("buildingId address.city lawyerVerificationStatus")
    .lean();
  const detailById = new Map(
    addressRows.map((row) => [
      row.buildingId,
      {
        city: row.address?.city ?? "",
        lawyerVerificationStatus: row.lawyerVerificationStatus ?? "not_started",
      },
    ]),
  );
  for (const building of buildings) {
    const detail = detailById.get(building.buildingId);
    building.city = detail?.city ?? "";
    building.lawyerVerificationStatus = detail?.lawyerVerificationStatus ?? "not_started";
  }

  const actionItems = await listActionRequiredDebtCases({
    context,
    buildingIds,
    buildingNames,
    limit: 15,
  });
  const waitingForLawyerItems = await listWaitingForLawyerDebtCases({
    context,
    buildingIds,
    buildingNames,
    limit: 15,
  });
  const recentActivity = await loadOperatorRecentActivityForBuildings({
    context,
    buildingIds,
  });

  if (context.user.role === UserRole.BUILDING_REP) {
    const building = buildings[0];
    if (!building) {
      return { kind: "empty" };
    }
    return {
      kind: "building_rep",
      building,
      metrics: building.metrics,
      actionItems: actionItems.filter((item) => item.buildingId === building.buildingId),
      waitingForLawyerItems: waitingForLawyerItems.filter(
        (item) => item.buildingId === building.buildingId,
      ),
      recentActivity: recentActivity.filter((item) => item.buildingId === building.buildingId),
    };
  }

  return {
    kind: "management_company",
    assignedBuildingCount: buildings.length,
    aggregateMetrics: sumMetrics(buildings.map((b) => b.metrics)),
    buildings,
    actionItems,
    waitingForLawyerItems,
    recentActivity,
  };
}
