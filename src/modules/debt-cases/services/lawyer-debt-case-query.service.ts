import "server-only";

import { BuildingOrganizationalStatus } from "@/modules/buildings/domain/building-status";
import { Building } from "@/modules/buildings/infra/building.model";
import { DebtCaseLawyerReviewStatus } from "@/modules/debt-cases/domain/debt-case-lawyer-review-status";
import { DebtCaseWorkflowStatus } from "@/modules/debt-cases/domain/debt-case-workflow-status";
import { resolveLegalDebtorMatchingLabel } from "@/modules/debt-cases/domain/debt-case-parties";
import type { BuildingLegalReadinessResult } from "@/modules/debt-cases/domain/debt-case-legal-readiness";
import type { DebtCaseRecord } from "@/modules/debt-cases/domain/debt-case-record.types";
import { DebtCase } from "@/modules/debt-cases/infra/debt-case.model";
import { mapPartiesFromDocument } from "@/modules/debt-cases/persistence/debt-case.mapper";
import type { DebtCaseDocument } from "@/modules/debt-cases/infra/debt-case.model";
import { assertLawyerAdminDebtCaseReview } from "@/modules/debt-cases/services/debt-case-authorization.service";
import { getDebtCase } from "@/modules/debt-cases/services/debt-case.service";
import { loadBuildingLegalReadinessForDebtCase } from "@/modules/debt-cases/services/debt-case-legal-readiness.loader";
import type { LawyerDebtCaseListParams } from "@/modules/debt-cases/validation/lawyer-debt-case-list.schema";
import { LAWYER_DEBT_CASE_LIST_PAGE_SIZE } from "@/modules/debt-cases/validation/lawyer-debt-case-list.schema";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import { connectMongo } from "@/shared/db/connect";

export type LawyerDebtCaseQueueRow = {
  debtCaseId: string;
  buildingId: string;
  buildingDisplayName: string;
  apartmentNumberDisplay: string;
  debtorDisplayName: string;
  principalAmountMinor: number | null;
  periodStartMonth: string | null;
  periodEndMonth: string | null;
  workflowStatus: DebtCaseWorkflowStatus;
  lawyerReviewStatus: DebtCaseLawyerReviewStatus;
  submittedAtIso: string | null;
  revision: number;
};

export type LawyerDebtCaseListResult = {
  items: LawyerDebtCaseQueueRow[];
  page: number;
  totalPages: number;
  totalCount: number;
};

export type LawyerDebtCaseDetailBundle = {
  record: DebtCaseRecord;
  buildingDisplayName: string;
  buildingCity: string;
  legalReadiness: BuildingLegalReadinessResult;
  canPerformReviewActions: boolean;
};

export type LawyerDebtCaseBuildingOption = {
  buildingId: string;
  displayName: string;
};

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildListFilter(params: LawyerDebtCaseListParams): Record<string, unknown> {
  const filter: Record<string, unknown> = {};

  if (params.workflowStatus !== "all") {
    filter.workflowStatus = params.workflowStatus;
  }
  if (params.lawyerReviewStatus !== "all") {
    filter.lawyerReviewStatus = params.lawyerReviewStatus;
  }
  if (params.buildingId) {
    filter.buildingId = params.buildingId;
  }

  const q = params.q?.trim();
  if (q) {
    const pattern = escapeRegex(q);
    filter.$or = [
      { apartmentNumberDisplay: { $regex: pattern, $options: "i" } },
      { "parties.propertyOwners.fullName": { $regex: pattern, $options: "i" } },
      { "parties.tenant.fullName": { $regex: pattern, $options: "i" } },
    ];
  }

  return filter;
}

async function loadBuildingNameMap(buildingIds: string[]): Promise<Map<string, string>> {
  if (buildingIds.length === 0) {
    return new Map();
  }
  await connectMongo();
  const rows = await Building.find({
    buildingId: { $in: buildingIds },
    organizationalStatus: BuildingOrganizationalStatus.ACTIVE,
  })
    .select("buildingId displayName")
    .lean();
  return new Map(rows.map((row) => [row.buildingId, row.displayName]));
}

function mapRow(
  doc: {
    debtCaseId: string;
    buildingId: string;
    apartmentNumberDisplay?: string | null;
    parties?: unknown;
    principalAmountMinor?: number | null;
    periodStartMonth?: string | null;
    periodEndMonth?: string | null;
    workflowStatus: string;
    lawyerReviewStatus: string;
    submittedAt?: Date | null;
    revision: number;
  },
  buildingNames: Map<string, string>,
): LawyerDebtCaseQueueRow {
  const parties = mapPartiesFromDocument(doc as unknown as DebtCaseDocument);
  const debtorDisplayName =
    parties.propertyOwners.length > 0 ? resolveLegalDebtorMatchingLabel(parties) : "—";

  return {
    debtCaseId: doc.debtCaseId,
    buildingId: doc.buildingId,
    buildingDisplayName: buildingNames.get(doc.buildingId) ?? "בניין לא ידוע",
    apartmentNumberDisplay: doc.apartmentNumberDisplay ?? "—",
    debtorDisplayName: debtorDisplayName || "—",
    principalAmountMinor: doc.principalAmountMinor ?? null,
    periodStartMonth: doc.periodStartMonth ?? null,
    periodEndMonth: doc.periodEndMonth ?? null,
    workflowStatus: doc.workflowStatus as DebtCaseWorkflowStatus,
    lawyerReviewStatus: doc.lawyerReviewStatus as DebtCaseLawyerReviewStatus,
    submittedAtIso: doc.submittedAt ? doc.submittedAt.toISOString() : null,
    revision: doc.revision,
  };
}

export async function listLawyerDebtCasesForReview(input: {
  context: AuthenticatedContext;
  params: LawyerDebtCaseListParams;
}): Promise<LawyerDebtCaseListResult> {
  await assertLawyerAdminDebtCaseReview({ context: input.context });
  await connectMongo();

  const filter = buildListFilter(input.params);
  const page = input.params.page;
  const skip = (page - 1) * LAWYER_DEBT_CASE_LIST_PAGE_SIZE;

  const [totalCount, rows] = await Promise.all([
    DebtCase.countDocuments(filter),
    DebtCase.find(filter)
      .sort({ submittedAt: -1, updatedAt: -1 })
      .skip(skip)
      .limit(LAWYER_DEBT_CASE_LIST_PAGE_SIZE)
      .lean(),
  ]);

  const buildingIds = [...new Set(rows.map((row) => row.buildingId))];
  const buildingNames = await loadBuildingNameMap(buildingIds);

  const totalPages = Math.max(1, Math.ceil(totalCount / LAWYER_DEBT_CASE_LIST_PAGE_SIZE));

  return {
    items: rows.map((row) => mapRow(row, buildingNames)),
    page,
    totalPages,
    totalCount,
  };
}

export async function listLawyerDebtCaseBuildingFilterOptions(input: {
  context: AuthenticatedContext;
}): Promise<LawyerDebtCaseBuildingOption[]> {
  await assertLawyerAdminDebtCaseReview({ context: input.context });
  await connectMongo();
  const buildingIds = await DebtCase.distinct("buildingId");
  if (buildingIds.length === 0) {
    return [];
  }
  const buildings = await Building.find({
    buildingId: { $in: buildingIds },
    organizationalStatus: BuildingOrganizationalStatus.ACTIVE,
  })
    .select("buildingId displayName")
    .sort({ displayName: 1 })
    .lean();
  return buildings.map((row) => ({
    buildingId: row.buildingId,
    displayName: row.displayName,
  }));
}

export async function loadLawyerDebtCaseDetailBundle(input: {
  context: AuthenticatedContext;
  debtCaseId: string;
}): Promise<LawyerDebtCaseDetailBundle> {
  await assertLawyerAdminDebtCaseReview({ context: input.context });
  const record = await getDebtCase({ context: input.context, debtCaseId: input.debtCaseId });

  await connectMongo();
  const building = await Building.findOne({
    buildingId: record.buildingId,
    organizationalStatus: BuildingOrganizationalStatus.ACTIVE,
  })
    .select("displayName address.city")
    .lean();

  const legalReadiness = await loadBuildingLegalReadinessForDebtCase(record.buildingId);

  const canPerformReviewActions =
    record.workflowStatus === DebtCaseWorkflowStatus.AWAITING_LAWYER_REVIEW &&
    record.lawyerReviewStatus === DebtCaseLawyerReviewStatus.PENDING;

  return {
    record,
    buildingDisplayName: building?.displayName ?? "בניין לא ידוע",
    buildingCity: building?.address?.city ?? "",
    legalReadiness,
    canPerformReviewActions,
  };
}
