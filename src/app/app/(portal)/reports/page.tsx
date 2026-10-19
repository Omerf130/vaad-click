import { OperatorPortalPageFrame } from "@/modules/portal/ui/OperatorPortalPageFrame";
import { loadReportPageData } from "@/modules/reports/services/report-page.service";
import { ReportsWorkspace } from "@/modules/reports/ui/ReportsWorkspace";
import { parseReportFiltersFromSearchParams } from "@/modules/reports/validation/report-filters.schema";
import { requireOperationalPortalAccess } from "@/shared/auth/require-access";
import { UserRole } from "@/modules/users/domain/user-role";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PortalReportsPage({ searchParams }: PageProps) {
  const context = await requireOperationalPortalAccess();
  if (context.user.role === UserRole.LAWYER_ADMIN) {
    const { redirect } = await import("next/navigation");
    redirect("/app/admin/reports");
  }

  const raw = await searchParams;
  const tabRaw = raw.tab;
  const tab = (Array.isArray(tabRaw) ? tabRaw[0] : tabRaw) ?? "overview";
  const filters = parseReportFiltersFromSearchParams(raw);

  const data = await loadReportPageData({
    context,
    filters,
    tab: tab as "overview" | "cases" | "buildings" | "export",
  });

  return (
    <OperatorPortalPageFrame
      title="דוחות ונתונים"
      subtitle="דוחות לפי הבניינים שבהם יש לכם הרשאה. סכומים — חוב רשום בלבד."
    >
      {data.ok ? (
        <ReportsWorkspace data={data} activeTab={tab} />
      ) : (
        <p role="alert">{data.message}</p>
      )}
    </OperatorPortalPageFrame>
  );
}
