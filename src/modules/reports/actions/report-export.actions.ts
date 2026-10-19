"use server";

import { UserRole } from "@/modules/users/domain/user-role";
import {
  buildDebtCasesCsv,
  buildDebtCasesExportFilename,
} from "@/modules/reports/services/report-csv.service";
import {
  fetchDebtCasesForExport,
  REPORT_MAX_EXPORT_ROWS,
} from "@/modules/reports/services/report-debt-case-query.service";
import { resolveReportScope, ReportAccessError } from "@/modules/reports/services/report-scope.service";
import { reportFiltersSchema } from "@/modules/reports/validation/report-filters.schema";
import {
  requireAuthenticatedPortalSession,
  requireLawyerAdminPortal,
  requireOperationalPortalAccess,
} from "@/shared/auth/require-access";
import { assertSameOriginMutationRequest } from "@/shared/security/request-origin";

export type ReportExportActionState =
  | { ok: true; filename: string; csvBase64: string }
  | { ok: false; message: string };

async function requireReportContext() {
  const sessionContext = await requireAuthenticatedPortalSession();
  if (sessionContext.user.role === UserRole.LAWYER_ADMIN) {
    return requireLawyerAdminPortal();
  }
  if (
    sessionContext.user.role === UserRole.MANAGEMENT_COMPANY ||
    sessionContext.user.role === UserRole.BUILDING_REP
  ) {
    return requireOperationalPortalAccess();
  }
  throw new ReportAccessError("Forbidden");
}

export async function exportReportDebtCasesCsvAction(
  _prev: ReportExportActionState | null,
  formData: FormData,
): Promise<ReportExportActionState> {
  try {
    await assertSameOriginMutationRequest();
    const context = await requireReportContext();

    const raw = Object.fromEntries(formData.entries()) as Record<string, string>;
    const filters = reportFiltersSchema.parse({
      preset: raw.preset,
      dateField: raw.dateField,
      customFrom: raw.customFrom || null,
      customTo: raw.customTo || null,
      buildingId: raw.buildingId || null,
      managementCompanyId: raw.managementCompanyId || null,
      workflowStatus: raw.workflowStatus || null,
      q: raw.q || null,
      page: 1,
      pageSize: 100,
      sort: raw.sort || "newest",
    });

    const scope = await resolveReportScope({
      context,
      requestedBuildingId: filters.buildingId,
      requestedManagementCompanyId: filters.managementCompanyId,
    });

    const rows = await fetchDebtCasesForExport({ context, scope, filters });
    const csv = buildDebtCasesCsv(rows);
    const prefix = scope.kind === "lawyer_admin" ? "vaad-admin" : "vaad-portal";
    const filename = buildDebtCasesExportFilename({ prefix, generatedAt: new Date() });

    return {
      ok: true,
      filename,
      csvBase64: Buffer.from(csv, "utf8").toString("base64"),
    };
  } catch (error) {
    if (error instanceof ReportAccessError) {
      return { ok: false, message: "אין הרשאה לייצא נתונים אלו." };
    }
    if (error instanceof Error && error.message === "EXPORT_LIMIT_EXCEEDED") {
      return {
        ok: false,
        message: `ייצוא מוגבל ל-${REPORT_MAX_EXPORT_ROWS} שורות. צמצמו את הסינון.`,
      };
    }
    if (error instanceof Error && error.message === "Cross-origin request rejected") {
      return { ok: false, message: "הבקשה נדחתה." };
    }
    return { ok: false, message: "לא ניתן לייצא את הדוח כעת." };
  }
}
