import "server-only";

import { ManagementCompany } from "@/modules/management-companies/infra/management-company.model";
import { UserRole } from "@/modules/users/domain/user-role";
import {
  loadReportOverview,
  loadReportStatusDistribution,
  loadReportSubmissionTrend,
  listReportBuildingSummaries,
  listReportDebtCases,
} from "@/modules/reports/services/report-debt-case-query.service";
import {
  listReportBuildingOptions,
  resolveReportScope,
  ReportAccessError,
} from "@/modules/reports/services/report-scope.service";
import type { ReportFilters } from "@/modules/reports/validation/report-filters.schema";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import { connectMongo } from "@/shared/db/connect";

export type ReportPageData = Awaited<ReturnType<typeof loadReportPageData>>;

export async function loadReportPageData(input: {
  context: AuthenticatedContext;
  filters: ReportFilters;
  tab: "overview" | "cases" | "buildings" | "export";
}) {
  try {
    const scope = await resolveReportScope({
      context: input.context,
      requestedBuildingId: input.filters.buildingId,
      requestedManagementCompanyId: input.filters.managementCompanyId,
    });

    const buildingOptions = await listReportBuildingOptions(input.context);

    let managementCompanyOptions: Array<{ id: string; displayName: string }> = [];
    if (input.context.user.role === UserRole.LAWYER_ADMIN) {
      await connectMongo();
      const companies = await ManagementCompany.find({}).select("managementCompanyId displayName").lean();
      managementCompanyOptions = companies.map((c) => ({
        id: c.managementCompanyId,
        displayName: c.displayName ?? c.managementCompanyId,
      }));
    }

    const [overview, distribution, trend, caseList, buildingSummaries] = await Promise.all([
      loadReportOverview({ context: input.context, scope, filters: input.filters }),
      loadReportStatusDistribution({ context: input.context, scope, filters: input.filters }),
      loadReportSubmissionTrend({ context: input.context, scope, filters: input.filters }),
      input.tab === "cases" || input.tab === "export"
        ? listReportDebtCases({ context: input.context, scope, filters: input.filters })
        : Promise.resolve(null),
      input.tab === "buildings" && scope.kind !== "building_rep"
        ? listReportBuildingSummaries({ context: input.context, scope, filters: input.filters })
        : Promise.resolve(null),
    ]);

    return {
      ok: true as const,
      scopeKind: scope.kind,
      buildingOptions,
      managementCompanyOptions,
      overview,
      distribution,
      trend,
      caseList,
      buildingSummaries,
      filters: input.filters,
    };
  } catch (error) {
    if (error instanceof ReportAccessError) {
      return { ok: false as const, message: "אין הרשאה לסינון שביקשתם." };
    }
    throw error;
  }
}
