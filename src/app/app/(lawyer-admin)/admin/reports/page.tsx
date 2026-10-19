import { AdminPageFrame } from "@/modules/admin/components/AdminPageFrame";
import { getAdminDashboardStats } from "@/modules/admin/dashboard/admin-dashboard-stats.service";
import { loadReportPageData } from "@/modules/reports/services/report-page.service";
import { ReportsWorkspace } from "@/modules/reports/ui/ReportsWorkspace";
import { parseReportFiltersFromSearchParams } from "@/modules/reports/validation/report-filters.schema";
import { requireLawyerAdminPortal } from "@/shared/auth/require-access";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminReportsPage({ searchParams }: PageProps) {
  const context = await requireLawyerAdminPortal();
  const raw = await searchParams;
  const tabRaw = raw.tab;
  const tab =
    (Array.isArray(tabRaw) ? tabRaw[0] : tabRaw) ?? "overview";
  const filters = parseReportFiltersFromSearchParams(raw);

  const [data, stats] = await Promise.all([
    loadReportPageData({ context, filters, tab: tab as "overview" | "cases" | "buildings" | "export" }),
    getAdminDashboardStats(context),
  ]);

  return (
    <AdminPageFrame
      title="דוחות ונתונים"
      subtitle="ניתוח תפעולי מבוסס נתונים שמורים במערכת — לא גבייה ולא שליחת מכתבים."
      breadcrumbs={[
        { label: "סקירה", href: "/app/admin" },
        { label: "דוחות ונתונים" },
      ]}
    >
      {data.ok ? (
        <ReportsWorkspace
          data={data}
          activeTab={tab}
          pendingApprovals={stats.pendingApprovals}
        />
      ) : (
        <p role="alert">{data.message}</p>
      )}
    </AdminPageFrame>
  );
}
